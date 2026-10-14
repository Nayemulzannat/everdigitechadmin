import type { PermissionKey } from "./permissions";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthRole {
  id: string;
  name: string;
  /** Super Admin passes every permission check, whatever `permissions` contains. */
  isSuperAdmin: boolean;
}

/** GET /api/admin/me → ApiResource<Me>. Also returned by POST /api/admin/login. */
export interface Me {
  user: AuthUser;
  role: AuthRole;
  permissions: PermissionKey[];
}

/** POST /api/admin/login */
export interface LoginRequest {
  email: string;
  password: string;
  remember: boolean;
}

/**
 * Why a sign-in failed, as the login page shows it. The API sends it as `code` in the error body:
 * `invalid_credentials` (422), `account_locked` (429, 5 failed attempts lock the pair for 15 minutes) and
 * `account_suspended` (403). When there is no code, it's inferred from the status: 422 → invalid_credentials,
 * 429 → locked, 423 → suspended.
 */
export type LoginErrorCode = "invalid_credentials" | "locked" | "suspended";

/** POST /api/admin/forgot-password → `{ message }` (the same answer whether or not the email belongs to an admin). */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * POST /api/admin/reset-password. `token` and `email` come from the link in the email (a reset link is valid for
 * 60 minutes; the "set your password" link of a new staff member for 48 hours, and also has `invite=1`).
 * Failures: 422 `invalid_reset_token` (wrong, used or expired link), 422 `validation_failed` with `errors.password`
 * (12+ characters, upper and lower case, a number, not found in a data breach), 429 `too_many_requests`.
 */
export interface ResetPasswordRequest {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

/** Answer of both password endpoints. */
export interface MessageResponse {
  message: string;
}
