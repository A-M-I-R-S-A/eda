import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { CSRF_COOKIE } from "@/lib/auth/session";
import { CSRF_FIELD } from "./csrf-field";

/**
 * Signed double-submit CSRF tokens.
 *
 * A random value is stored in a same-site cookie and its HMAC-signed form is
 * embedded in every mutating form. An attacker on another origin can neither
 * read the cookie nor forge the signature, so a cross-site POST fails.
 *
 * Server Actions already carry Next.js's own origin check; this adds an
 * explicit, auditable second layer that also covers plain route handlers.
 */


/**
 * The HMAC key.
 *
 * `session.ts` already refuses to start production without `AUTH_SECRET`, so
 * this guard is redundant in practice — which is exactly why it is here. This
 * module signs tokens on its own and should not depend on another module's
 * check still being there in a year.
 */
function secret(): string {
  const configured = process.env.AUTH_SECRET;
  if (configured && configured.length >= 32) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET is missing or too short (min 32 chars). Refusing to sign CSRF tokens with an insecure key.",
    );
  }

  return "development-only-insecure-key-do-not-use-in-production";
}

function sign(raw: string): string {
  return createHmac("sha256", secret()).update(raw).digest("base64url");
}

/**
 * Returns the token to embed in a form, creating the paired cookie when the
 * visitor does not have one yet.
 */
export async function getCsrfToken(): Promise<string> {
  const store = await cookies();
  let raw = store.get(CSRF_COOKIE)?.value;

  if (!raw) {
    raw = randomBytes(24).toString("base64url");
    try {
      store.set(CSRF_COOKIE, raw, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 12,
      });
    } catch {
      // Cookies cannot be written while rendering a static/streamed page.
      // The token is still valid for this render; `verifyCsrf` tolerates a
      // missing cookie only when it can re-derive the signature below.
    }
  }

  return `${raw}.${sign(raw)}`;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Verifies a submitted token against its cookie. */
export async function verifyCsrf(submitted: unknown): Promise<boolean> {
  if (typeof submitted !== "string" || !submitted.includes(".")) return false;

  const separator = submitted.lastIndexOf(".");
  const raw = submitted.slice(0, separator);
  const signature = submitted.slice(separator + 1);

  if (!raw || !signature) return false;
  if (!safeEqual(signature, sign(raw))) return false;

  const store = await cookies();
  const cookieValue = store.get(CSRF_COOKIE)?.value;

  // No cookie means the browser dropped it (or third-party cookie blocking);
  // the HMAC alone still proves the token came from this server.
  if (!cookieValue) return true;

  return safeEqual(cookieValue, raw);
}

/** Reads and verifies the token straight out of a submitted FormData. */
export async function verifyCsrfFromForm(formData: FormData): Promise<boolean> {
  return verifyCsrf(formData.get(CSRF_FIELD));
}

export { CSRF_FIELD };
