import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResource } from "@/types/api";
import type {
  Product,
  ProductGroup,
  ProductGroupInput,
  ProductInput,
  ProductOptions,
  ProductsIndexResponse,
  ProductsPage,
  ProductsParams,
} from "@/types/products";
import { ADMIN_PREFIX, api } from "./client";

export type * from "@/types/products";

// The catalog has no mock mode: it always calls the Laravel API.

export const PRODUCT_STATUSES = ["active", "inactive"] as const;

export const productKeys = {
  all: ["products"] as const,
  list: (params: ProductsParams) => [...productKeys.all, "list", params] as const,
  options: () => [...productKeys.all, "options"] as const,
  groups: () => ["product-groups"] as const,
};

// ── Money. The API uses whole paisa; people type taka.

/** "899" or "899.5" → 89900 / 89950 paisa. null when it is not a valid amount (empty, negative, more than 2 decimals). */
export function takaToPaisa(text: string): number | null {
  const value = text.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;

  return Math.round(Number(value) * 100);
}

/** 89900 → "899", 89950 → "899.50": for an input field. */
export function paisaToTaka(paisa: number): string {
  return Number.isInteger(paisa / 100) ? String(paisa / 100) : (paisa / 100).toFixed(2);
}

/** 89900 → "৳899", 89950 → "৳899.50", 12345600 → "৳1,23,456". */
export function formatPaisa(paisa: number): string {
  const whole = Math.floor(paisa / 100);
  const rest = paisa % 100;

  return `৳${new Intl.NumberFormat("en-IN").format(whole)}${rest ? `.${String(rest).padStart(2, "0")}` : ""}`;
}

/** The tax part and the total for an amount entered in the form, for the preview under a price. */
export function previewTax(paisa: number, tax: ProductOptions["tax"]) {
  if (tax.inclusive) {
    const net = Math.round(paisa / (1 + tax.rate / 100));

    return { net, tax: paisa - net, total: paisa };
  }
  const amount = Math.round((paisa * tax.rate) / 100);

  return { net: paisa, tax: amount, total: paisa + amount };
}

// ── Products

function toQuery(params: ProductsParams) {
  return {
    page: params.page > 1 ? params.page : undefined,
    status: params.status === "all" ? undefined : params.status,
    group: params.group === "all" ? undefined : params.group,
    search: params.search.trim() || undefined,
  };
}

/** GET /api/admin/products */
export async function getProducts(params: ProductsParams): Promise<ProductsPage> {
  const res = (await api.get<ProductsIndexResponse>(`${ADMIN_PREFIX}/products`, { params: toQuery(params) })).data;

  return {
    items: res.data,
    total: res.meta.total,
    page: res.meta.current_page,
    pageSize: res.meta.per_page,
    pageCount: Math.max(1, res.meta.last_page),
    counts: res.meta.counts,
  };
}

export async function getProductOptions(): Promise<ProductOptions> {
  return (await api.get<ApiResource<ProductOptions>>(`${ADMIN_PREFIX}/products/options`)).data.data;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  return (await api.post<ApiResource<Product>>(`${ADMIN_PREFIX}/products`, input)).data.data;
}

/** `prices`, when sent, REPLACES the product's prices. */
export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  return (await api.put<ApiResource<Product>>(`${ADMIN_PREFIX}/products/${id}`, input)).data.data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`${ADMIN_PREFIX}/products/${id}`);
}

export function useProducts(params: ProductsParams) {
  return useQuery({ queryKey: productKeys.list(params), queryFn: () => getProducts(params), placeholderData: keepPreviousData });
}

export function useProductOptions() {
  return useQuery({ queryKey: productKeys.options(), queryFn: getProductOptions, staleTime: 60_000 });
}

/** After a change the lists, the counts and the group product counts are fetched again. */
function useRefresh() {
  const queryClient = useQueryClient();

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: productKeys.all }),
      queryClient.invalidateQueries({ queryKey: productKeys.groups() }),
    ]);
}

export function useCreateProduct() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: createProduct, onSuccess: refresh });
}

export function useUpdateProduct() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<ProductInput> }) => updateProduct(id, input), onSuccess: refresh });
}

export function useDeleteProduct() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: deleteProduct, onSuccess: refresh });
}

// ── Groups

export async function getProductGroups(): Promise<ProductGroup[]> {
  return (await api.get<ApiResource<ProductGroup[]>>(`${ADMIN_PREFIX}/product-groups`)).data.data;
}

export async function createProductGroup(input: ProductGroupInput): Promise<ProductGroup> {
  return (await api.post<ApiResource<ProductGroup>>(`${ADMIN_PREFIX}/product-groups`, input)).data.data;
}

export async function updateProductGroup(id: string, input: Partial<ProductGroupInput>): Promise<ProductGroup> {
  return (await api.put<ApiResource<ProductGroup>>(`${ADMIN_PREFIX}/product-groups/${id}`, input)).data.data;
}

export async function deleteProductGroup(id: string): Promise<void> {
  await api.delete(`${ADMIN_PREFIX}/product-groups/${id}`);
}

export function useProductGroups() {
  return useQuery({ queryKey: productKeys.groups(), queryFn: getProductGroups });
}

export function useCreateProductGroup() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: createProductGroup, onSuccess: refresh });
}

export function useUpdateProductGroup() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<ProductGroupInput> }) => updateProductGroup(id, input), onSuccess: refresh });
}

export function useDeleteProductGroup() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: deleteProductGroup, onSuccess: refresh });
}

export type TaxSettings = ProductOptions["tax"];

/** GET /api/admin/settings/tax. Needs settings.view. */
export async function getTaxSettings(): Promise<TaxSettings> {
  return (await api.get<ApiResource<TaxSettings>>(`${ADMIN_PREFIX}/settings/tax`)).data.data;
}

/** PUT /api/admin/settings/tax. Needs settings.edit. `rate` is a percent. */
export async function updateTaxSettings(input: TaxSettings): Promise<TaxSettings> {
  return (await api.put<ApiResource<TaxSettings>>(`${ADMIN_PREFIX}/settings/tax`, input)).data.data;
}

export function useTaxSettings(enabled = true) {
  return useQuery({ queryKey: [...productKeys.all, "tax"], queryFn: getTaxSettings, enabled });
}

export function useUpdateTaxSettings() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: updateTaxSettings, onSuccess: refresh });
}
