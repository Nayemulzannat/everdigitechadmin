// Route rules shared by proxy.ts (server) and the AuthProvider (browser). No browser or Node APIs here.

/**
 * Cookie that tells proxy.ts the browser has signed in. Laravel's own session cookie can't be used for this:
 * Laravel sets it for guests too (e.g. after GET /sanctum/csrf-cookie), so its presence doesn't mean signed in.
 * This is only a routing hint; the API still checks the real session on every request.
 */
export const SIGNED_IN_COOKIE = "ed_signed_in";

export const LOGIN_PATH = "/login";
export const HOME_PATH = "/dashboard";

/** Paths that work without signing in. Everything else is an admin route. */
const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/ui-preview"];

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * The `?next=` target, only if it's a path inside this app. Blocks open redirects ("//evil.com",
 * "https://…", "/\evil.com") and loops back to /login.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  const path = next.split(/[?#]/)[0] ?? "";
  if (path === LOGIN_PATH || path.startsWith(`${LOGIN_PATH}/`)) return null;
  return next;
}

/** "/login?next=/clients%3Fpage%3D2" for the current location. */
export function loginUrlFor(pathAndQuery: string) {
  const next = safeNextPath(pathAndQuery);
  return next && next !== "/" ? `${LOGIN_PATH}?next=${encodeURIComponent(next)}` : LOGIN_PATH;
}
