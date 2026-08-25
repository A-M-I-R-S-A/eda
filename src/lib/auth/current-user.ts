import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/config/routes";
import type { SessionPayload } from "@/types";
import { SESSION_COOKIE, canAccessAdmin, verifySessionToken } from "./session";
import { can, type Permission } from "./permissions";

/**
 * Server-side session accessors.
 *
 * `proxy.ts` performs the cheap edge-level gate; these helpers are the
 * authoritative check inside server components, route handlers and actions —
 * defence in depth, so a misconfigured matcher can never expose admin data.
 */

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/**
 * Gate a page on a capability.
 *
 * Passing no permission means "any staff member" — used by the shell itself
 * and by screens every role can see, such as the dashboard.
 */
export async function requireAdminSession(
  permission?: Permission,
): Promise<SessionPayload> {
  const session = await getCurrentSession();

  if (!session || !canAccessAdmin(session)) {
    redirect(ROUTES.admin.login);
  }

  if (permission && !can(session, permission)) {
    redirect(ROUTES.admin.denied);
  }

  return session;
}

/** Non-redirecting variant for actions and route handlers. */
export async function getAdminSession(
  permission?: Permission,
): Promise<SessionPayload | null> {
  const session = await getCurrentSession();
  if (!session || !canAccessAdmin(session)) return null;
  if (permission && !can(session, permission)) return null;
  return session;
}

/**
 * Best-effort client address for the audit log.
 *
 * Behind a proxy the socket address is the proxy's, so the forwarded headers
 * are consulted first. Returns `undefined` rather than a misleading value when
 * nothing usable is present.
 */
export async function getRequestIp(): Promise<string | undefined> {
  try {
    const store = await headers();
    const forwarded = store.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
    return store.get("x-real-ip")?.trim() || undefined;
  } catch {
    return undefined;
  }
}
