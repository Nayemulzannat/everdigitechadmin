import { ApiError } from "@/lib/api/errors";
import type { ForgotPasswordRequest, LoginRequest, Me, ResetPasswordRequest } from "@/types/auth";
import type { PermissionKey } from "@/types/permissions";
import { isMock } from "@/lib/api/mode";
import { getMockRoleSnapshot } from "./roles";

// Mock sign-in. The part of the email before "@" picks the role, so permission gating can be tried without the API:
//   admin@…  billing@…  support@…  sales@…  → that role from the Roles page (edits there apply on next sign-in)
//   anything else                          → Super Admin
// Preview the error banners with wrong@example.com, locked@example.com and suspended@example.com.

const STORAGE_KEY = "everdigitech.mock.session";

const DEMO_NAMES: Record<string, string> = {
  super: "Nayemul Zannat",
  admin: "Arif Hasan",
  billing: "Nusrat Jahan",
  support: "Sabbir Hossain",
  sales: "Farhana Akter",
};

interface StoredSession {
  email: string;
}

const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

function storages(): Storage[] {
  try {
    return [window.localStorage, window.sessionStorage];
  } catch {
    return [];
  }
}

function readSession(): StoredSession | null {
  for (const storage of storages()) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as StoredSession;
    } catch {
      // Unreadable or blocked storage: treat as signed out.
    }
  }
  return null;
}

function writeSession(session: StoredSession | null, remember = false) {
  for (const storage of storages()) {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  if (!session) return;
  try {
    (remember ? window.localStorage : window.sessionStorage).setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage blocked: the session lasts until the page reloads.
  }
}

function meFor(email: string): Me {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  const role = getMockRoleSnapshot(local) ?? getMockRoleSnapshot("super");
  if (!role) throw new ApiError(500, "Mock roles are missing.");
  const isSuperAdmin = role.locked;
  return {
    user: { id: `staff-${role.id}`, name: DEMO_NAMES[role.id] ?? role.name, email },
    role: { id: role.id, name: role.name, isSuperAdmin },
    permissions: role.permissions,
  };
}

export async function mockLogin(values: LoginRequest): Promise<Me> {
  await delay(900);
  const email = values.email.trim().toLowerCase();
  if (email === "wrong@example.com") {
    throw new ApiError(422, "These credentials do not match our records.", { code: "invalid_credentials" });
  }
  if (email === "locked@example.com") throw new ApiError(429, "Too many sign-in attempts.", { code: "locked" });
  if (email === "suspended@example.com") throw new ApiError(423, "This account is suspended.", { code: "suspended" });
  writeSession({ email }, values.remember);
  return meFor(email);
}

/** The signed-in mock user, or a 401 like the real GET /me when nobody is signed in. */
export async function mockMe(): Promise<Me> {
  await delay(250);
  const session = readSession();
  if (!session) throw new ApiError(401, "Unauthenticated.");
  return meFor(session.email);
}

export async function mockLogout(): Promise<void> {
  await delay(200);
  writeSession(null);
}

/**
 * Mock endpoints call this to answer 403 the way Laravel would. When sign-in is real (only some areas are mocked),
 * there is no mock session to check, and the real API has already decided who may call, so it does nothing.
 */
export function assertMockPermission(permission: PermissionKey) {
  if (!isMock("auth")) return;
  const session = readSession();
  if (!session) throw new ApiError(401, "Unauthenticated.");
  const me = meFor(session.email);
  if (!me.role.isSuperAdmin && !me.permissions.includes(permission)) {
    throw new ApiError(403, "You don't have permission to do that.");
  }
}

// Password reset in mock mode. Try the link states with these emails and tokens:
//   forgot-password: wrong@example.com is answered like any other email (the API never says whether it exists);
//                    locked@example.com answers 429.
//   reset-password:  token "expired" → invalid_reset_token; a password containing "password" → rejected as breached.

const RESET_MESSAGE = "If that email belongs to an admin account, we have sent a password reset link.";

export async function mockForgotPassword(values: ForgotPasswordRequest): Promise<string> {
  await delay(700);
  if (values.email.trim().toLowerCase() === "locked@example.com") throw new ApiError(429, "Too many attempts. Wait a moment and try again.", { code: "too_many_requests" });
  return RESET_MESSAGE;
}

export async function mockResetPassword(values: ResetPasswordRequest): Promise<string> {
  await delay(700);
  if (values.token === "expired") {
    throw new ApiError(422, "This password reset link is invalid or has expired.", { code: "invalid_reset_token" });
  }
  if (values.password.toLowerCase().includes("password")) {
    const message = "The given password has appeared in a data leak. Please choose a different password.";
    throw new ApiError(422, message, { code: "validation_failed", errors: { password: [message] } });
  }
  return "Your password has been set. You can sign in now.";
}
