import "server-only";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { ensureSchema, getPool } from "@/lib/db/mysql";
import { newId } from "@/lib/utils/id";
import type { OtpPurpose } from "./constants";

/**
 * Phone verification by one-time code.
 *
 * ── Storage ───────────────────────────────────────────────────────────────
 * Codes live in their own short-lived table rather than in the cached
 * snapshot: they are written on every send, read once and swept constantly.
 * Only a SHA-256 hash is stored — a leaked database backup must not hand over
 * live codes.
 *
 * ── Proof of verification ─────────────────────────────────────────────────
 * Passing the check mints a short-lived signed token bound to that exact
 * number. The form posts the token back with the submission and the action
 * re-verifies it, so "verified" cannot be claimed by a client that simply
 * flipped a hidden field.
 */

export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS || 120);
export const OTP_MAX_ATTEMPTS = 5;
/** How long a successful verification stays usable while the form is filled in. */
export const OTP_PROOF_TTL_SECONDS = Number(
  process.env.OTP_PROOF_TTL_SECONDS || 30 * 60,
);

export type { OtpPurpose };

const PROOF_ISSUER = "dadavar-law";
const PROOF_AUDIENCE = "phone-verification";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function hashCode(phone: string, code: string): string {
  // The phone is part of the digest so a hash cannot be replayed onto another
  // number even if two challenges collide on the same code.
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

function proofKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is required to issue verification proofs.");
    }
    return new TextEncoder().encode(
      "development-only-insecure-key-do-not-use-in-production",
    );
  }
  return new TextEncoder().encode(secret);
}

/** Cryptographically uniform 6-digit code, zero-padded. */
export function generateCode(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/* -------------------------------------------------------------------------- */
/*  Challenge lifecycle                                                       */
/* -------------------------------------------------------------------------- */

interface ChallengeRow extends RowDataPacket {
  id: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
}

/**
 * Stores a fresh challenge and invalidates any earlier one for this number.
 *
 * Superseding rather than accumulating means "resend" cannot be used to widen
 * the guessing surface: exactly one code is live per number and purpose.
 */
export async function createChallenge(
  phone: string,
  purpose: OtpPurpose,
  code: string,
): Promise<void> {
  await ensureSchema();
  const pool = getPool();

  await pool.query(
    "UPDATE otp_codes SET consumed = 1 WHERE phone = ? AND purpose = ? AND consumed = 0",
    [phone, purpose],
  );

  await pool.query(
    `INSERT INTO otp_codes (id, phone, purpose, code_hash, attempts, consumed, expires_at, created_at)
     VALUES (?, ?, ?, ?, 0, 0, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? SECOND), UTC_TIMESTAMP(3))`,
    [newId(), phone, purpose, hashCode(phone, code), OTP_TTL_SECONDS],
  );
}

/** Seconds remaining on the live challenge, or 0 when there is none. */
export async function secondsRemaining(
  phone: string,
  purpose: OtpPurpose,
): Promise<number> {
  await ensureSchema();
  const [rows] = await getPool().query<(RowDataPacket & { remaining: number })[]>(
    `SELECT TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(3), expires_at) AS remaining
       FROM otp_codes
      WHERE phone = ? AND purpose = ? AND consumed = 0 AND expires_at > UTC_TIMESTAMP(3)
      ORDER BY created_at DESC LIMIT 1`,
    [phone, purpose],
  );
  return Math.max(0, Number(rows[0]?.remaining ?? 0));
}

export type VerifyOutcome =
  | { ok: true }
  | { ok: false; reason: "expired" | "mismatch" | "exhausted" };

/**
 * Checks a submitted code and consumes the challenge on success.
 *
 * The attempt counter is incremented *before* comparison, so a client that
 * abandons the request mid-flight still burns the attempt.
 */
export async function verifyChallenge(
  phone: string,
  purpose: OtpPurpose,
  code: string,
): Promise<VerifyOutcome> {
  await ensureSchema();
  const pool = getPool();

  const [rows] = await pool.query<ChallengeRow[]>(
    `SELECT id, code_hash, attempts
       FROM otp_codes
      WHERE phone = ? AND purpose = ? AND consumed = 0 AND expires_at > UTC_TIMESTAMP(3)
      ORDER BY created_at DESC LIMIT 1`,
    [phone, purpose],
  );

  const challenge = rows[0];
  if (!challenge) return { ok: false, reason: "expired" };

  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    await pool.query("UPDATE otp_codes SET consumed = 1 WHERE id = ?", [
      challenge.id,
    ]);
    return { ok: false, reason: "exhausted" };
  }

  await pool.query(
    "UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?",
    [challenge.id],
  );

  if (!safeEqualHex(challenge.code_hash, hashCode(phone, code))) {
    return { ok: false, reason: "mismatch" };
  }

  const [result] = await pool.query<ResultSetHeader>(
    "UPDATE otp_codes SET consumed = 1 WHERE id = ? AND consumed = 0",
    [challenge.id],
  );

  // Zero rows means another request consumed it first — treat as a miss rather
  // than letting the same code verify twice.
  if (result.affectedRows === 0) return { ok: false, reason: "expired" };

  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*  Proof tokens                                                              */
/* -------------------------------------------------------------------------- */

/** Mints the token a verified form posts back with its submission. */
export async function issueProof(
  phone: string,
  purpose: OtpPurpose,
): Promise<string> {
  return new SignJWT({ phone, purpose })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(PROOF_ISSUER)
    .setAudience(PROOF_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${OTP_PROOF_TTL_SECONDS}s`)
    .sign(proofKey());
}

/**
 * Confirms a submission carries proof for the number it claims.
 *
 * The phone is compared against the token's own claim, so a proof obtained for
 * one number cannot be attached to a submission for another.
 */
export async function verifyProof(
  token: unknown,
  phone: string,
  purpose: OtpPurpose,
): Promise<boolean> {
  if (typeof token !== "string" || !token) return false;

  try {
    const { payload } = await jwtVerify(token, proofKey(), {
      issuer: PROOF_ISSUER,
      audience: PROOF_AUDIENCE,
      algorithms: ["HS256"],
    });
    return payload.phone === phone && payload.purpose === purpose;
  } catch {
    return false;
  }
}
