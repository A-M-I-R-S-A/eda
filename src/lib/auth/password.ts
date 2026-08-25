import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Password hashing with scrypt (memory-hard, in the Node standard library —
 * no native bcrypt/argon2 build step required).
 *
 * Stored format:  scrypt$N$r$p$<salt-b64>$<hash-b64>
 * The parameters live inside the string so they can be raised later without
 * invalidating existing hashes.
 */

const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(
    password.normalize("NFKC"),
    salt,
    KEY_LENGTH,
    PARAMS,
  );

  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string | undefined,
): Promise<boolean> {
  if (!stored) {
    // Still burn comparable time so a missing account is not distinguishable
    // from a wrong password by response timing.
    await scryptAsync(password, randomBytes(SALT_LENGTH), KEY_LENGTH, PARAMS);
    return false;
  }

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");

  let derived: Buffer;
  try {
    derived = await scryptAsync(password.normalize("NFKC"), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: PARAMS.maxmem,
    });
  } catch {
    return false;
  }

  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/** Basic strength gate applied on top of the zod schema. */
export function assessPasswordStrength(password: string): {
  ok: boolean;
  message?: string;
} {
  if (password.length < 10) {
    return { ok: false, message: "رمز عبور باید حداقل ۱۰ نویسه باشد." };
  }
  if (!/[a-z]/i.test(password)) {
    return { ok: false, message: "رمز عبور باید شامل حروف لاتین باشد." };
  }
  if (!/\d/.test(password)) {
    return { ok: false, message: "رمز عبور باید شامل حداقل یک رقم باشد." };
  }
  return { ok: true };
}
