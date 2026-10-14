import type { PaginatedResource } from "./api";

/**
 * What the staff list shows. `invited` is an active account whose owner hasn't set a password yet (the invite link
 * is still pending); suspended wins over invited.
 */
export type StaffStatus = "active" | "invited" | "suspended";

/** The status a PUT can set. An invited person is saved as `active`: the invite state is cleared by setting a password. */
export type StaffWritableStatus = "active" | "suspended";

/** The staff member's role. Staff have exactly one; null only if the role was removed. */
export interface StaffRole {
  id: string;
  name: string;
  isSuperAdmin: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  /** null when no phone number is on file. */
  phone: string | null;
  /** null when the person has no profile photo. */
  avatarUrl: string | null;
  status: StaffStatus;
  role: StaffRole | null;
  /** ISO timestamp the invite was last sent; null once the person has set a password. */
  invitedAt: string | null;
  /** ISO timestamp; null until the person has signed in. */
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  /** "Chrome on Windows"; null when unknown. There is no location: the API has no GeoIP lookup. */
  lastLoginDevice: string | null;
  /** Name of the admin who suspended them, when known. */
  suspendedBy: string | null;
  twoFactorEnabled: boolean;
  /** ISO timestamp. */
  createdAt: string;
}

/** Query string for GET /api/admin/staff. "all" and empty values are omitted. */
export interface StaffParams {
  /** 1-based. */
  page: number;
  /** Role id. */
  role: string | "all";
  status: StaffStatus | "all";
  /** Matches name or email. */
  search: string;
}

export type StaffCounts = Record<StaffStatus | "all", number>;

/** Numbers for the stat cards: everyone, whatever the filters. */
export interface StaffStats {
  total: number;
  active: number;
  invited: number;
  suspended: number;
  /** Signed-up active staff who use two-factor, out of `twoFactorOf`. */
  twoFactorOn: number;
  twoFactorOf: number;
  /** How many roles exist ("Across 5 roles"). */
  roles: number;
  /** Active Super Admins; at 1 the last one can't be suspended, removed or moved to another role. */
  activeSuperAdmins: number;
}

/** GET /api/admin/staff: a Laravel paginated collection (15 per page) with per-status `counts` and `stats` in meta. */
export type StaffIndexResponse = PaginatedResource<StaffMember, { counts: StaffCounts; stats: StaffStats }>;

/** What the app works with after unwrapping the paginator. */
export interface StaffPage {
  items: StaffMember[];
  /** Matches for the current status/role/search. */
  total: number;
  /** The page actually returned (clamped to the last page). */
  page: number;
  pageSize: number;
  pageCount: number;
  /** Per-status totals for the current role and search, for the tab counts. */
  counts: StaffCounts;
  stats: StaffStats;
}

/** GET /api/admin/staff/{id}, and what POST and PUT return: ApiResource<StaffMember>. */
export type StaffResponse = { data: StaffMember };

/** A role someone can be given. GET /api/admin/staff/roles → ApiResource<StaffRoleOption[]> (needs only staff.view). */
export interface StaffRoleOption {
  id: string;
  name: string;
  description: string;
  isSuperAdmin: boolean;
}

/** POST /api/admin/staff. No password: the person gets an email with a link (valid 48 hours) to set one. */
export interface CreateStaffInput {
  name: string;
  email: string;
  phone: string | null;
  /** Role id. Only a Super Admin can pick Super Admin. */
  role: string;
}

/** PUT /api/admin/staff/{id}. The email can't be changed. */
export interface UpdateStaffInput {
  name: string;
  phone: string | null;
  role: string;
  status: StaffWritableStatus;
}

/**
 * `code` values the staff endpoints can answer with (in `ApiErrorBody.code`):
 * - 403 `super_admin_only`: assigning the Super Admin role, or changing a Super Admin account, without being one;
 * - 422 `cannot_suspend_self`, `cannot_delete_self`: you can't do that to your own account;
 * - 422 `last_super_admin`: the last active Super Admin can't be suspended, deleted or moved to another role;
 * - 422 `already_active` (POST /staff/{id}/resend-invite): the person has already signed in;
 * - 502 `mail_failed` (POST /staff, POST /staff/{id}/resend-invite): the invite email could not be sent (mail server down or
 *   misconfigured). Nothing is saved for POST /staff, so the same request can simply be sent again.
 */
export type StaffErrorCode =
  | "super_admin_only"
  | "cannot_suspend_self"
  | "cannot_delete_self"
  | "last_super_admin"
  | "already_active"
  | "mail_failed";
