import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, canAccessAdmin, verifySessionToken } from "@/lib/auth/session";

/**
 * Edge gate for the admin area (Next.js `proxy` convention).
 *
 * This is the *first* line of defence — it stops unauthenticated requests
 * before any admin page renders or any query runs. Every admin page and
 * action still re-checks the session server-side (`requireAdminSession`), so a
 * matcher mistake here cannot leak confidential case data.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isLoginPage = pathname === "/admin/login";
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  const authorised = canAccessAdmin(session);

  // Already signed in → skip the login screen.
  if (isLoginPage && authorised) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (!isLoginPage && !authorised) {
    const loginUrl = new URL("/admin/login", request.url);
    // Preserve the intended destination so login can bounce the user back.
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("next", `${pathname}${search}`);
    }

    const response = NextResponse.redirect(loginUrl);
    // Clear a stale/expired cookie so the browser stops sending it.
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
