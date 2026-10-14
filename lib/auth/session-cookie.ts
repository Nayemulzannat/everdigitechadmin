import { SIGNED_IN_COOKIE } from "./routes";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** Sets the signed-in hint cookie read by proxy.ts. "Keep me signed in" makes it last 30 days. */
export function markSignedIn(remember: boolean) {
  const maxAge = remember ? `; Max-Age=${THIRTY_DAYS}` : "";
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SIGNED_IN_COOKIE}=1; Path=/; SameSite=Lax${maxAge}${secure}`;
}

export function clearSignedIn() {
  document.cookie = `${SIGNED_IN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function hasSignedInCookie() {
  return document.cookie.split("; ").some((c) => c.startsWith(`${SIGNED_IN_COOKIE}=`));
}
