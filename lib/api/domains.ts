import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResource } from "@/types/api";
import type {
  Domain,
  DomainExtension,
  DomainExtensionInput,
  DomainPricingRule,
  DomainInput,
  DomainsIndexResponse,
  DomainsPage,
  DomainsParams,
  ExtensionsPage,
  ExtensionsParams,
} from "@/types/domains";
import { ADMIN_PREFIX, api } from "./client";

export type * from "@/types/domains";

export const DOMAIN_STATUS_LABELS = { pending: "Pending", active: "Active", expired: "Expired", cancelled: "Cancelled" } as const;

export const domainKeys = {
  all: ["domains"] as const,
  list: (params: DomainsParams) => [...domainKeys.all, "list", params] as const,
  one: (id: string) => [...domainKeys.all, "one", id] as const,
  extensions: () => ["domain-extensions"] as const,
};

/** GET /api/admin/domains?status=&search=&page= */
export async function getDomains(params: DomainsParams): Promise<DomainsPage> {
  const res = (
    await api.get<DomainsIndexResponse>(`${ADMIN_PREFIX}/domains`, {
      params: { page: params.page > 1 ? params.page : undefined, status: params.status === "all" ? undefined : params.status, search: params.search.trim() || undefined },
    })
  ).data;

  return { items: res.data, total: res.meta.total, page: res.meta.current_page, pageSize: res.meta.per_page, pageCount: Math.max(1, res.meta.last_page), counts: res.meta.counts };
}

export async function getDomain(id: string): Promise<Domain> {
  return (await api.get<ApiResource<Domain>>(`${ADMIN_PREFIX}/domains/${id}`)).data.data;
}

export async function createDomain(input: DomainInput): Promise<Domain> {
  return (await api.post<ApiResource<Domain>>(`${ADMIN_PREFIX}/domains`, input)).data.data;
}

export async function updateDomain(id: string, input: Partial<DomainInput>): Promise<Domain> {
  return (await api.put<ApiResource<Domain>>(`${ADMIN_PREFIX}/domains/${id}`, input)).data.data;
}

export async function deleteDomain(id: string): Promise<void> {
  await api.delete(`${ADMIN_PREFIX}/domains/${id}`);
}

export function useDomains(params: DomainsParams) {
  return useQuery({ queryKey: domainKeys.list(params), queryFn: () => getDomains(params), placeholderData: keepPreviousData });
}

export function useDomain(id: string | null) {
  return useQuery({ queryKey: domainKeys.one(id ?? ""), queryFn: () => getDomain(id as string), enabled: id !== null });
}

function useRefreshDomains() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: domainKeys.all });
}

export function useCreateDomain() {
  const refresh = useRefreshDomains();
  return useMutation({ mutationFn: createDomain, onSuccess: refresh });
}

export function useUpdateDomain() {
  const refresh = useRefreshDomains();
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<DomainInput> }) => updateDomain(id, input), onSuccess: refresh });
}

export function useDeleteDomain() {
  const refresh = useRefreshDomains();
  return useMutation({ mutationFn: deleteDomain, onSuccess: refresh });
}

// ── Extensions

export async function getExtensions(params: ExtensionsParams): Promise<ExtensionsPage> {
  const res = (
    await api.get<{ data: DomainExtension[]; meta: { current_page: number; last_page: number; per_page: number; total: number; counts: ExtensionsPage["counts"] } }>(`${ADMIN_PREFIX}/domain-extensions`, {
      params: { page: params.page > 1 ? params.page : undefined, status: params.status === "all" ? undefined : params.status, search: params.search.trim() || undefined },
    })
  ).data;

  return { items: res.data, total: res.meta.total, page: res.meta.current_page, pageSize: res.meta.per_page, pageCount: Math.max(1, res.meta.last_page), counts: res.meta.counts };
}

export function useExtensions(params: ExtensionsParams) {
  return useQuery({ queryKey: [...domainKeys.extensions(), params], queryFn: () => getExtensions(params), placeholderData: keepPreviousData });
}

function useRefreshExtensions() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: domainKeys.extensions() });
}

export function useCreateExtension() {
  const refresh = useRefreshExtensions();
  return useMutation({ mutationFn: async (input: DomainExtensionInput) => (await api.post<ApiResource<DomainExtension>>(`${ADMIN_PREFIX}/domain-extensions`, input)).data.data, onSuccess: refresh });
}

export function useUpdateExtension() {
  const refresh = useRefreshExtensions();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<DomainExtensionInput> }) => (await api.put<ApiResource<DomainExtension>>(`${ADMIN_PREFIX}/domain-extensions/${id}`, input)).data.data,
    onSuccess: refresh,
  });
}

export function useDeleteExtension() {
  const refresh = useRefreshExtensions();
  return useMutation({ mutationFn: async (id: string) => void (await api.delete(`${ADMIN_PREFIX}/domain-extensions/${id}`)), onSuccess: refresh });
}

/** POST /api/admin/domain-extensions/sync: fills the list from the registrar's price list (new ones come in switched off). */
export function useSyncExtensions() {
  const refresh = useRefreshExtensions();
  return useMutation({
    mutationFn: async () => (await api.post<ApiResource<{ added: number; updated: number; total: number }>>(`${ADMIN_PREFIX}/domain-extensions/sync`)).data.data,
    onSuccess: refresh,
  });
}

/** POST /api/admin/domain-extensions/activate-priced: switches on every one that has a price and no restriction. */
export function useActivatePriced() {
  const refresh = useRefreshExtensions();
  return useMutation({
    mutationFn: async () => (await api.post<ApiResource<{ activated: number }>>(`${ADMIN_PREFIX}/domain-extensions/activate-priced`)).data.data,
    onSuccess: refresh,
  });
}

// ── The pricing rule

export function usePricingRule() {
  return useQuery({ queryKey: [...domainKeys.extensions(), "rule"], queryFn: async () => (await api.get<ApiResource<DomainPricingRule>>(`${ADMIN_PREFIX}/domain-pricing`)).data.data });
}

export function useUpdatePricingRule() {
  const refresh = useRefreshExtensions();
  return useMutation({ mutationFn: async (input: DomainPricingRule) => (await api.put<ApiResource<DomainPricingRule>>(`${ADMIN_PREFIX}/domain-pricing`, input)).data.data, onSuccess: refresh });
}
