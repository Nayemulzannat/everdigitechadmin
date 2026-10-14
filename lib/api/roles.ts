import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResource } from "@/types/api";
import type { PermissionModule } from "@/types/permissions";
import type { CreateRoleInput, Role, UpdateRoleInput } from "@/types/roles";
import { ADMIN_PREFIX, api } from "./client";
import { request } from "./mode";

export type * from "@/types/roles";

const mock = () => import("@/lib/mock/roles");
const roleUrl = (id: string) => `${ADMIN_PREFIX}/roles/${encodeURIComponent(id)}`;

export const roleKeys = {
  all: ["roles"] as const,
  list: () => [...roleKeys.all, "list"] as const,
  permissions: () => [...roleKeys.all, "permissions"] as const,
};

/** GET /api/admin/roles: every staff role with its granted permissions. */
export async function getRoles(): Promise<Role[]> {
  return request(
    "roles",
    async () => (await mock()).getMockRoles(),
    async () => (await api.get<ApiResource<Role[]>>(`${ADMIN_PREFIX}/roles`)).data.data,
  );
}

/** GET /api/admin/permissions: modules with their actions and optional special permission. */
export async function getPermissions(): Promise<PermissionModule[]> {
  return request(
    "roles",
    async () => (await mock()).getMockPermissions(),
    async () => (await api.get<ApiResource<PermissionModule[]>>(`${ADMIN_PREFIX}/permissions`)).data.data,
  );
}

/** PUT /api/admin/roles/{id}. Rejects for locked roles and duplicate names. */
export async function updateRole(id: string, data: UpdateRoleInput): Promise<Role> {
  return request(
    "roles",
    async () => (await mock()).updateMockRole(id, data),
    async () => (await api.put<ApiResource<Role>>(roleUrl(id), data)).data.data,
  );
}

/** POST /api/admin/roles */
export async function createRole(data: CreateRoleInput): Promise<Role> {
  return request(
    "roles",
    async () => (await mock()).createMockRole(data),
    async () => (await api.post<ApiResource<Role>>(`${ADMIN_PREFIX}/roles`, data)).data.data,
  );
}

/** DELETE /api/admin/roles/{id} */
export async function deleteRole(id: string): Promise<void> {
  return request(
    "roles",
    async () => (await mock()).deleteMockRole(id),
    async () => {
      await api.delete(roleUrl(id));
    },
  );
}

export function useRoles() {
  return useQuery({ queryKey: roleKeys.list(), queryFn: getRoles });
}

export function usePermissions() {
  return useQuery({ queryKey: roleKeys.permissions(), queryFn: getPermissions, staleTime: Infinity });
}

/** Writes the saved role straight into the cache, so the editor doesn't flash the old values before the refetch. */
function useRoleMutation<TVars>(fn: (vars: TVars) => Promise<Role | void>, apply: (roles: Role[], result: Role | void, vars: TVars) => Role[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result, vars) => {
      queryClient.setQueryData<Role[]>(roleKeys.list(), (roles) => (roles ? apply(roles, result, vars) : roles));
      void queryClient.invalidateQueries({ queryKey: roleKeys.list() });
    },
  });
}

export function useUpdateRole() {
  return useRoleMutation(
    ({ id, data }: { id: string; data: UpdateRoleInput }) => updateRole(id, data),
    (roles, saved) => roles.map((r) => (saved && r.id === saved.id ? saved : r)),
  );
}

export function useCreateRole() {
  return useRoleMutation(
    (data: CreateRoleInput) => createRole(data),
    (roles, created) => (created ? [...roles, created] : roles),
  );
}

export function useDeleteRole() {
  return useRoleMutation(
    (id: string) => deleteRole(id),
    (roles, _result, id) => roles.filter((r) => r.id !== id),
  );
}
