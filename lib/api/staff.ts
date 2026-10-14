import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResource } from "@/types/api";
import type {
  CreateStaffInput,
  StaffIndexResponse,
  StaffMember,
  StaffPage,
  StaffParams,
  StaffRoleOption,
  StaffStatus,
  UpdateStaffInput,
} from "@/types/staff";
import { ADMIN_PREFIX, api } from "./client";
import { request } from "./mode";
import { roleKeys } from "./roles";

export type * from "@/types/staff";

export const STAFF_STATUSES = ["active", "invited", "suspended"] as const satisfies readonly StaffStatus[];

export const STAFF_STATUS_LABELS: Record<StaffStatus, string> = {
  active: "Active",
  invited: "Invited",
  suspended: "Suspended",
};

/** Page size the mock uses. The real API picks its own and reports it as `meta.per_page`. */
export const STAFF_PAGE_SIZE = 15;

const mock = () => import("@/lib/mock/staff");
const staffUrl = (id: string) => `${ADMIN_PREFIX}/staff/${encodeURIComponent(id)}`;

export const staffKeys = {
  all: ["staff"] as const,
  lists: () => [...staffKeys.all, "list"] as const,
  list: (params: StaffParams) => [...staffKeys.lists(), params] as const,
  roles: () => [...staffKeys.all, "roles"] as const,
};

/** Unwraps Laravel's paginator into what the list needs. */
function toStaffPage(res: StaffIndexResponse): StaffPage {
  return {
    items: res.data,
    total: res.meta.total,
    page: res.meta.current_page,
    pageSize: res.meta.per_page,
    pageCount: Math.max(1, res.meta.last_page),
    counts: res.meta.counts,
    stats: res.meta.stats,
  };
}

/** Defaults ("all", empty search, page 1) are left out of the query string. */
function toQuery(params: StaffParams) {
  return {
    page: params.page > 1 ? params.page : undefined,
    status: params.status === "all" ? undefined : params.status,
    role: params.role === "all" ? undefined : params.role,
    search: params.search.trim() || undefined,
  };
}

/** GET /api/admin/staff?page=&status=&role=&search= */
export async function getStaff(params: StaffParams): Promise<StaffPage> {
  const res = await request(
    "staff",
    async () => (await mock()).getMockStaff(params, STAFF_PAGE_SIZE),
    async () => (await api.get<StaffIndexResponse>(`${ADMIN_PREFIX}/staff`, { params: toQuery(params) })).data,
  );
  return toStaffPage(res);
}

/** GET /api/admin/staff/roles: the roles someone can be given, with descriptions (needs only staff.view). */
export async function getStaffRoles(): Promise<StaffRoleOption[]> {
  return request(
    "staff",
    async () => (await mock()).getMockStaffRoles(),
    async () => (await api.get<ApiResource<StaffRoleOption[]>>(`${ADMIN_PREFIX}/staff/roles`)).data.data,
  );
}

/** POST /api/admin/staff: creates the account and emails the "set your password" link. */
export async function createStaff(data: CreateStaffInput): Promise<StaffMember> {
  return request(
    "staff",
    async () => (await mock()).createMockStaff(data),
    async () => (await api.post<ApiResource<StaffMember>>(`${ADMIN_PREFIX}/staff`, data)).data.data,
  );
}

/** PUT /api/admin/staff/{id} */
export async function updateStaff(id: string, data: UpdateStaffInput): Promise<StaffMember> {
  return request(
    "staff",
    async () => (await mock()).updateMockStaff(id, data),
    async () => (await api.put<ApiResource<StaffMember>>(staffUrl(id), data)).data.data,
  );
}

/** DELETE /api/admin/staff/{id}: soft delete. */
export async function deleteStaff(id: string): Promise<void> {
  return request(
    "staff",
    async () => (await mock()).deleteMockStaff(id),
    async () => {
      await api.delete(staffUrl(id));
    },
  );
}

/** POST /api/admin/staff/{id}/resend-invite */
export async function resendStaffInvite(id: string): Promise<void> {
  return request(
    "staff",
    async () => (await mock()).resendMockInvite(id),
    async () => {
      await api.post(`${staffUrl(id)}/resend-invite`);
    },
  );
}

/** Keeps the previous page on screen while the next one loads, so filters and paging don't flash skeletons. */
export function useStaff(params: StaffParams) {
  return useQuery({
    queryKey: staffKeys.list(params),
    queryFn: () => getStaff(params),
    placeholderData: keepPreviousData,
  });
}

export function useStaffRoles() {
  return useQuery({ queryKey: staffKeys.roles(), queryFn: getStaffRoles, staleTime: 5 * 60_000 });
}

/** After any change the lists (rows, tab counts, stat cards) and each role's staff count are out of date. */
function useRefreshStaff() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: roleKeys.list() });
  };
}

export function useCreateStaff() {
  const refresh = useRefreshStaff();
  return useMutation({ mutationFn: createStaff, onSuccess: refresh });
}

export function useUpdateStaff() {
  const refresh = useRefreshStaff();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: UpdateStaffInput }) => updateStaff(id, data), onSuccess: refresh });
}

export function useDeleteStaff() {
  const refresh = useRefreshStaff();
  return useMutation({ mutationFn: deleteStaff, onSuccess: refresh });
}

export function useResendStaffInvite() {
  const refresh = useRefreshStaff();
  return useMutation({ mutationFn: resendStaffInvite, onSuccess: refresh });
}
