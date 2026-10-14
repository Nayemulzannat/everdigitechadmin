import type { Me } from "@/types/auth";
import type { PermissionKey } from "@/types/permissions";

/**
 * Whether the signed-in staff member has a permission. With an array, any one of them is enough.
 * Super Admin passes every check.
 */
export function hasPermission(me: Me | null | undefined, permission: PermissionKey | readonly PermissionKey[]) {
  if (!me) return false;
  if (me.role.isSuperAdmin) return true;
  const wanted = typeof permission === "string" ? [permission] : permission;
  return wanted.some((p) => me.permissions.includes(p));
}
