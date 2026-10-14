import type { PermissionKey } from "./permissions";

/** GET /api/admin/roles → { data: Role[] }; PUT/POST return ApiResource<Role>. */
export interface Role {
  id: string;
  name: string;
  description: string;
  /** Locked roles (Super Admin) always have every permission and can't be edited or deleted. */
  locked: boolean;
  staffCount: number;
  /** Granted keys in catalog order. */
  permissions: PermissionKey[];
}

/** PUT /api/admin/roles/{id} */
export interface UpdateRoleInput {
  name: string;
  description: string;
  permissions: PermissionKey[];
}

/** POST /api/admin/roles */
export interface CreateRoleInput {
  name: string;
  description: string;
}
