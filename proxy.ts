import { NextResponse, type NextRequest } from "next/server";
import { HOME_PATH, LOGIN_PATH, SIGNED_IN_COOKIE, isPublicPath, loginUrlFor, safeNextPath } from "@/lib/auth/routes";

/**
 * Route protection (Next.js 16 "proxy", formerly middleware):
 * - admin routes without the signed-in cookie → /login?next=<where you were going>;
 * - /login while signed in → ?next= (if it's a path in this app) or /dashboard.
 * The cookie is only a hint for routing; the API checks the real Laravel session on every request, and the
 * AuthProvider sends the user back to /login if GET /me says they're signed out.
 */
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const signedIn = request.cookies.has(SIGNED_IN_COOKIE);

  if (pathname === LOGIN_PATH) {
    if (!signedIn) return NextResponse.next();
    const target = safeNextPath(searchParams.get("next")) ?? HOME_PATH;
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (!signedIn && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL(loginUrlFor(`${pathname}${search}`), request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, API routes and files with an extension (favicon, images, fonts…).
  matcher: ["/((?!_next/static|_next/image|api/|.*\\.[^/]+$).*)"],
};
