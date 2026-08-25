"use server";

import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findUserByEmail, recordAudit, recordLogin } from "@/lib/db";
import { ROUTES } from "@/lib/config/routes";
import {
  CSRF_COOKIE,
  SESSION_COOKIE,
  canAccessAdmin,
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { getCurrentSession } from "@/lib/auth/current-user";
import { verifyCsrfFromForm } from "@/lib/security/csrf";
import {
  RATE_LIMITS,
  getClientIp,
  rateLimit,
  rateLimitMessage,
} from "@/lib/security/rate-limit";
import { loginSchema, toFieldErrors } from "@/lib/validation/schemas";
import { errorState, type FormState } from "./types";

/**
 * Authentication actions.
 *
 * Hardening notes:
 *  • Failed logins are rate-limited per IP *and* per email, so neither a
 *    single address nor a single account can be brute-forced.
 *  • The response is identical for "unknown user", "wrong password" and
 *    "insufficient role" — no account enumeration.
 *  • `verifyPassword` burns comparable CPU when the user does not exist, so
 *    response timing does not leak existence either.
 *  • The `next` parameter is only honoured when it is a relative `/admin` path,
 *    which prevents an open redirect.
 */

const INVALID_CREDENTIALS = "ایمیل یا رمز عبور نادرست است.";

function safeRedirectTarget(raw: FormDataEntryValue | null): string {
  if (typeof raw !== "string" || !raw) return ROUTES.admin.root;
  // Must be a same-origin admin path: no protocol, no host, no `//` prefix.
  if (!raw.startsWith("/admin") || raw.startsWith("//")) return ROUTES.admin.root;
  return raw;
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await verifyCsrfFromForm(formData))) {
    return errorState(
      "اعتبار این فرم منقضی شده است. صفحه را تازه‌سازی کرده و دوباره تلاش کنید.",
    );
  }

  const ip = await getClientIp();
  const ipLimit = await rateLimit(
    `login:ip:${ip}`,
    RATE_LIMITS.login.limit,
    RATE_LIMITS.login.windowMs,
  );
  if (!ipLimit.allowed) return errorState(rateLimitMessage(ipLimit.retryAfter));

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return errorState(
      "لطفاً خطاهای فرم را برطرف کنید.",
      toFieldErrors(parsed.error),
    );
  }

  const { email, password } = parsed.data;

  const accountLimit = await rateLimit(
    `login:acct:${email}`,
    RATE_LIMITS.login.limit,
    RATE_LIMITS.login.windowMs,
  );
  if (!accountLimit.allowed) {
    return errorState(rateLimitMessage(accountLimit.retryAfter));
  }

  let target: string = ROUTES.admin.root;

  try {
    const user = await findUserByEmail(email);
    const passwordOk = await verifyPassword(password, user?.passwordHash);

    // One identical failure path for every reason.
    if (!user || !passwordOk || user.status !== "active") {
      /**
       * Recorded even though the response is deliberately vague: for a legal
       * practice, a run of failed sign-ins against a real account is exactly
       * the thing someone needs to be able to see after the fact.
       */
      await recordAudit({
        actorId: user?.id ?? "unknown",
        actorName: email,
        actorRole: user?.role ?? "client",
        action: "login-failed",
        entity: "session",
        entityLabel: email,
        detail: !user
          ? "unknown-account"
          : user.status !== "active"
            ? `status:${user.status}`
            : "bad-password",
        ip,
      });
      return errorState(INVALID_CREDENTIALS);
    }

    const session = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.fullName,
    };

    if (!canAccessAdmin(session)) {
      return errorState(INVALID_CREDENTIALS);
    }

    const token = await signSessionToken(session);
    const store = await cookies();
    store.set(SESSION_COOKIE, token, sessionCookieOptions());

    await recordLogin(user.id);
    await recordAudit({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: "login",
      entity: "session",
      entityLabel: user.email,
      ip,
    });
    target = safeRedirectTarget(formData.get("next"));
  } catch (error) {
    console.error("[auth] login failed", error);
    return errorState("ورود انجام نشد. لطفاً دوباره تلاش کنید.");
  }

  // `redirect` throws — it must run outside the try/catch above.
  // `target` is validated by `safeRedirectTarget`, which only lets through
  // relative /admin paths; the cast satisfies Next's typed-routes signature.
  redirect(target as Route);
}

export async function logoutAction(): Promise<void> {
  const session = await getCurrentSession();
  if (session) {
    await recordAudit({
      actorId: session.sub,
      actorName: session.name,
      actorRole: session.role,
      action: "logout",
      entity: "session",
      entityLabel: session.email,
      ip: await getClientIp(),
    });
  }

  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(CSRF_COOKIE);

  redirect(ROUTES.admin.login);
}
