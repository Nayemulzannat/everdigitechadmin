// Which staff actions the signed-in person may use on a staff member. Pure functions (no React, no I/O) so they can be
// unit tested. The API enforces every one of these rules too; here they only decide what to disable, and why.

import type { StaffMember, StaffRoleOption, StaffStats } from "@/types/staff";

export interface StaffViewer {
  id: string;
  isSuperAdmin: boolean;
}

/** `allowed: false` comes with the sentence shown as the tooltip. */
export type StaffRule = { allowed: true } | { allowed: false; reason: string };

export interface StaffActions {
  /** Open the edit form (name, phone, role). */
  edit: StaffRule;
  /** Change the role inside the edit form. */
  changeRole: StaffRule;
  suspend: StaffRule;
  reactivate: StaffRule;
  remove: StaffRule;
  resendInvite: StaffRule;
}

const OK: StaffRule = { allowed: true };
const no = (reason: string): StaffRule => ({ allowed: false, reason });

export const REASONS = {
  superAdminOnly: "Only a Super Admin can change a Super Admin account.",
  lastSuperAdmin: "This is the last active Super Admin, so they can't be suspended, removed or given another role.",
  suspendSelf: "You can't suspend your own account.",
  removeSelf: "You can't remove your own account.",
} as const;

/** True for the only active Super Admin. Invited people count as active; only suspended ones don't. */
export function isLastSuperAdmin(member: StaffMember, stats: Pick<StaffStats, "activeSuperAdmins">) {
  return Boolean(member.role?.isSuperAdmin) && member.status !== "suspended" && stats.activeSuperAdmins <= 1;
}

export function staffActions(member: StaffMember, viewer: StaffViewer, stats: Pick<StaffStats, "activeSuperAdmins">): StaffActions {
  const isSelf = member.id === viewer.id;
  const needsSuperAdmin = Boolean(member.role?.isSuperAdmin) && !viewer.isSuperAdmin;
  const last = isLastSuperAdmin(member, stats);

  // Same order as the API: who may touch a Super Admin, then the last Super Admin, then yourself.
  const guard = (selfReason: string): StaffRule =>
    needsSuperAdmin ? no(REASONS.superAdminOnly) : last ? no(REASONS.lastSuperAdmin) : isSelf ? no(selfReason) : OK;

  return {
    edit: needsSuperAdmin ? no(REASONS.superAdminOnly) : OK,
    changeRole: needsSuperAdmin ? no(REASONS.superAdminOnly) : last ? no(REASONS.lastSuperAdmin) : OK,
    suspend: guard(REASONS.suspendSelf),
    reactivate: needsSuperAdmin ? no(REASONS.superAdminOnly) : OK,
    remove: guard(REASONS.removeSelf),
    resendInvite: needsSuperAdmin ? no(REASONS.superAdminOnly) : OK,
  };
}

/** Roles to offer on the form: Super Admin only appears for a Super Admin (and for someone who already is one). */
export function assignableRoles(roles: readonly StaffRoleOption[], viewer: Pick<StaffViewer, "isSuperAdmin">, current?: StaffMember["role"]) {
  return roles.filter((role) => !role.isSuperAdmin || viewer.isSuperAdmin || role.id === current?.id);
}
