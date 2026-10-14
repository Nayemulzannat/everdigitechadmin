import axios, { type InternalAxiosRequestConfig } from "axios";
import { clearSignedIn } from "@/lib/auth/session-cookie";
import { isPublicPath, loginUrlFor } from "@/lib/auth/routes";
import { toast } from "@/lib/toast";
import { ApiError, toApiError } from "./errors";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Let the caller handle 401 instead of redirecting to /login (used by GET /me and POST /login). */
    skipAuthRedirect?: boolean;
    /** Don't show the "no permission" toast for a 403. */
    silentForbidden?: boolean;
  }
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _csrfRetried?: boolean;
}

/** All admin endpoints live under this prefix. */
export const ADMIN_PREFIX = "/api/admin";

/**
 * Axios instance for the Laravel API (Sanctum SPA auth): sends the session cookie and the X-XSRF-TOKEN header
 * (read from Laravel's XSRF-TOKEN cookie) on every request, including cross-origin ones.
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
});

/** Asks Laravel for a fresh XSRF-TOKEN cookie. Call before POST /login. */
export async function ensureCsrfCookie() {
  await api.get("/sanctum/csrf-cookie");
}

/**
 * What happens on 401 and 403, for real and mock calls alike:
 * - 401: forget the session and go to /login, keeping the current URL as ?next=.
 * - 403: toast "You don't have permission to do that".
 */
export function handleApiFailure(error: ApiError, options: { skipAuthRedirect?: boolean; silentForbidden?: boolean } = {}) {
  if (typeof window === "undefined") return;
  if (error.status === 401 && !options.skipAuthRedirect) {
    clearSignedIn();
    const { pathname, search } = window.location;
    if (!isPublicPath(pathname)) window.location.assign(loginUrlFor(`${pathname}${search}`));
  } else if (error.status === 403 && !options.silentForbidden) {
    toast({ title: "You don't have permission to do that", tone: "warning" });
  }
}

api.interceptors.response.use(undefined, async (raw: unknown) => {
  const config = axios.isAxiosError(raw) ? (raw.config as RetryableConfig | undefined) : undefined;
  const error = toApiError(raw);

  // 419: the CSRF token expired. Refresh it once and replay the request.
  if (error.status === 419 && config && !config._csrfRetried) {
    config._csrfRetried = true;
    await ensureCsrfCookie();
    return api.request(config);
  }

  handleApiFailure(error, { skipAuthRedirect: config?.skipAuthRedirect, silentForbidden: config?.silentForbidden });
  throw error;
});
