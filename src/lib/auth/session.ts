import { SignJWT, jwtVerify } from "jose";
import type { SessionPayload, UserRole } from "@/types";
import { isAdminRole } from "./permissions";

/**
 * Stateless session tokens (HS256 JWT) stored in an httpOnly cookie.
 *
 * This module is Edge-compatible on purpose: `middleware.ts` verifies the same
 * token with the same code path that server components use, so there is only
 * one definition of "is this request authenticated".
 */

export const SESSION_COOKIE = "dadavar_session";
export const CSRF_COOKIE = "dadavar_csrf";

export const SESSION_MAX_AGE = Number(
  process.env.SESSION_MAX_AGE_SECONDS || 60 * 60 * 8,
);

const ISSUER = "dadavar-law";
const AUDIENCE = "dadavar-admin";

let cachedKey: Uint8Array | null = null;

function getSecretKey(): Uint8Array {
  if (cachedKey) return cachedKey;

  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET is missing or too short (min 32 chars). Refusing to start with an insecure session key.",
      );
    }
    // Development convenience only — never reached in production.
    console.warn(
      "[auth] AUTH_SECRET is not set; using an insecure development key.",
    );
    cachedKey = new TextEncoder().encode(
      "development-only-insecure-key-do-not-use-in-production",
    );
    return cachedKey;
  }

  cachedKey = new TextEncoder().encode(secret);
  return cachedKey;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });

    if (!payload.sub || typeof payload.role !== "string") return null;

    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      role: payload.role as UserRole,
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Role-based access control                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Access is capability-based, not rank-based — see `./permissions`. The
 * helpers below are the thin session-aware wrappers the rest of the app uses.
 */
export { can, canAll, canAny, permissionsFor, type Permission } from "./permissions";

/**
 * Exact-role check.
 *
 * Kept narrow on purpose: `admin` satisfies any role because the super
 * administrator is defined as holding every capability, but `editor` and
 * `manager` are siblings and neither satisfies the other.
 */
export function hasRole(
  session: SessionPayload | null,
  role: UserRole,
): boolean {
  if (!session) return false;
  if (session.role === "admin") return true;
  return session.role === role;
}

/** Any staff role may reach the admin area; what they see depends on rights. */
export function canAccessAdmin(session: SessionPayload | null): boolean {
  return isAdminRole(session?.role);
}

/** Destructive and configuration operations are super-administrator only. */
export function canManageSystem(session: SessionPayload | null): boolean {
  return session?.role === "admin";
}

export const sessionCookieOptions = (maxAge: number = SESSION_MAX_AGE) =>
  ({
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
