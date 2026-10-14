import type { ApiResource } from "@/types/api";
import type { ForgotPasswordRequest, LoginErrorCode, LoginRequest, MessageResponse, Me, ResetPasswordRequest } from "@/types/auth";
import { ADMIN_PREFIX, api, ensureCsrfCookie } from "./client";
import { ApiError, toApiError } from "./errors";
import { isMock } from "./mode";

export const authKeys = {
  me: ["auth", "me"] as const,
};

/** A failed sign-in, with the reason the login page shows a banner for. */
export class LoginError extends Error {
  readonly code: LoginErrorCode;
  constructor(code: LoginErrorCode, message: string) {
    super(message);
    this.name = "LoginError";
    this.code = code;
  }
}

/** `code` values the Laravel API sends for a failed sign-in, and the banner each one gets. */
const LOGIN_CODES: Record<string, LoginErrorCode> = {
  invalid_credentials: "invalid_credentials",
  account_locked: "locked",
  account_suspended: "suspended",
  // Older names, still accepted.
  locked: "locked",
  suspended: "suspended",
};

export function loginErrorCode(error: ApiError): LoginErrorCode | null {
  const byCode = error.code ? LOGIN_CODES[error.code] : undefined;
  if (byCode) return byCode;
  if (error.status === 422) return "invalid_credentials";
  if (error.status === 429) return "locked";
  if (error.status === 423) return "suspended";
  return null;
}

/** GET /api/admin/me → the signed-in user, role and permissions, or null when signed out (401). */
export async function getMe(): Promise<Me | null> {
  try {
    if (isMock("auth")) return await (await import("@/lib/mock/auth")).mockMe();
    const { data } = await api.get<ApiResource<Me>>(`${ADMIN_PREFIX}/me`, { skipAuthRedirect: true });
    return data.data;
  } catch (raw) {
    const error = toApiError(raw);
    if (error.status === 401) return null;
    throw error;
  }
}

/**
 * GET /sanctum/csrf-cookie, then POST /api/admin/login. Resolves with the signed-in user (from the response,
 * or from GET /me when the API answers 204). Rejects with LoginError for wrong credentials, locked or suspended.
 */
export async function login(values: LoginRequest): Promise<Me> {
  try {
    if (isMock("auth")) return await (await import("@/lib/mock/auth")).mockLogin(values);
    await ensureCsrfCookie();
    // 403 here means "suspended" (shown as a banner), not "no permission", so no toast.
    const { data } = await api.post<ApiResource<Me> | "">(`${ADMIN_PREFIX}/login`, values, {
      skipAuthRedirect: true,
      silentForbidden: true,
    });
    if (data) return data.data;
    const me = await getMe();
    if (!me) throw new ApiError(401, "Signing in didn't work. Try again.");
    return me;
  } catch (raw) {
    const error = toApiError(raw);
    const code = loginErrorCode(error);
    throw code ? new LoginError(code, error.message) : error;
  }
}

/** POST /api/admin/logout. Never throws: signing out locally must work even if the API can't be reached. */
export async function logout(): Promise<void> {
  try {
    if (isMock("auth")) return await (await import("@/lib/mock/auth")).mockLogout();
    await api.post(`${ADMIN_PREFIX}/logout`, undefined, { skipAuthRedirect: true });
  } catch {
    // Ignore: the local session is cleared either way.
  }
}

/** POST /api/admin/forgot-password. Resolves with the API's message, which is the same whether or not the email exists. */
export async function forgotPassword(values: ForgotPasswordRequest): Promise<string> {
  if (isMock("auth")) return (await import("@/lib/mock/auth")).mockForgotPassword(values);
  await ensureCsrfCookie();
  const { data } = await api.post<MessageResponse>(`${ADMIN_PREFIX}/forgot-password`, values, { skipAuthRedirect: true, silentForbidden: true });
  return data.message;
}

/** POST /api/admin/reset-password. Rejects with ApiError: `code` invalid_reset_token, or `fieldErrors.password`. */
export async function resetPassword(values: ResetPasswordRequest): Promise<string> {
  if (isMock("auth")) return (await import("@/lib/mock/auth")).mockResetPassword(values);
  await ensureCsrfCookie();
  const { data } = await api.post<MessageResponse>(`${ADMIN_PREFIX}/reset-password`, values, { skipAuthRedirect: true, silentForbidden: true });
  return data.message;
}
