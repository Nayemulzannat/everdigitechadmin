import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResource } from "@/types/api";
import type { ClientDetail, ClientGroup, ClientsIndexResponse, ClientsPage, ClientsParams, ClientStatus, ClientUpdateInput } from "@/types/clients";
import { ADMIN_PREFIX, api } from "./client";
import { request } from "./mode";

export type * from "@/types/clients";

export const CLIENT_STATUSES = ["active", "inactive", "closed"] as const satisfies readonly ClientStatus[];
export const CLIENT_GROUPS = ["regular", "reseller", "vip"] as const satisfies readonly ClientGroup[];

export const CLIENT_GROUP_LABELS: Record<ClientGroup, string> = {
  regular: "Regular",
  reseller: "Reseller",
  vip: "VIP",
};

/** Page size the mock uses. The real API picks its own and reports it as `meta.per_page`. */
export const CLIENTS_PAGE_SIZE = 8;

export const clientKeys = {
  all: ["clients"] as const,
  list: (params: ClientsParams) => [...clientKeys.all, "list", params] as const,
};

/** Unwraps Laravel's paginator into what the list needs. */
function toClientsPage(res: ClientsIndexResponse): ClientsPage {
  return {
    items: res.data,
    total: res.meta.total,
    page: res.meta.current_page,
    pageSize: res.meta.per_page,
    pageCount: Math.max(1, res.meta.last_page),
    counts: res.meta.counts,
  };
}

/** Defaults ("all", empty search, page 1) are left out of the query string. */
function toQuery(params: ClientsParams) {
  return {
    page: params.page > 1 ? params.page : undefined,
    status: params.status === "all" ? undefined : params.status,
    group: params.group === "all" ? undefined : params.group,
    search: params.search.trim() || undefined,
  };
}

/** GET /api/admin/clients?page=&status=&group=&search= */
export async function getClients(params: ClientsParams): Promise<ClientsPage> {
  const res = await request(
    "clients",
    async () => (await import("@/lib/mock/clients")).getMockClients(params, CLIENTS_PAGE_SIZE),
    async () => (await api.get<ClientsIndexResponse>(`${ADMIN_PREFIX}/clients`, { params: toQuery(params) })).data,
  );
  return toClientsPage(res);
}

/** Keeps the previous page on screen while the next one loads, so filters and paging don't flash skeletons. */
export function useClients(params: ClientsParams) {
  return useQuery({
    queryKey: clientKeys.list(params),
    queryFn: () => getClients(params),
    placeholderData: keepPreviousData,
  });
}

/**
 * POST /api/admin/clients/{id}/impersonate: a one-minute, one-use link that signs the staff member in to the client
 * panel as the account owner (needs clients.login_as). Errors: 422 account_closed, client_suspended, not_a_member.
 */
export async function impersonateClient(id: string, userId?: string): Promise<{ url: string }> {
  return request(
    "clients",
    // The mock has no client panel to sign in to; return the panel's address so the flow can still be tried.
    async () => ({ url: `${process.env.NEXT_PUBLIC_CLIENT_AREA_URL ?? "http://localhost:3002"}/login` }),
    async () => (await api.post<{ url: string }>(`${ADMIN_PREFIX}/clients/${id}/impersonate`, userId ? { client_user_id: Number(userId) } : {})).data,
  );
}

/** `userId`: a member of the account to sign in as, instead of the owner. */
export function useImpersonateClient() {
  return useMutation({ mutationFn: ({ id, userId }: { id: string; userId?: string }) => impersonateClient(id, userId) });
}

// ── One client (needs the real API: the mock list has no detail)

export const clientDetailKey = (id: string) => [...clientKeys.all, "one", id] as const;

export async function getClient(id: string): Promise<ClientDetail> {
  return (await api.get<ApiResource<ClientDetail>>(`${ADMIN_PREFIX}/clients/${id}`)).data.data;
}

export function useClient(id: string) {
  return useQuery({ queryKey: clientDetailKey(id), queryFn: () => getClient(id) });
}

export function useUpdateClient(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ClientUpdateInput) => (await api.put<ApiResource<ClientDetail>>(`${ADMIN_PREFIX}/clients/${id}`, input)).data.data,
    onSuccess: (client) => {
      queryClient.setQueryData(clientDetailKey(id), client);
      void queryClient.invalidateQueries({ queryKey: [...clientKeys.all, "list"] });
    },
  });
}
