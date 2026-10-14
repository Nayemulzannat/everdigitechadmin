import type { PaginatedResource } from "./api";

// The catalog: what the company sells. Every amount is a whole number of PAISA (100 paisa = 1 taka).

export type BillingCycle = "monthly" | "quarterly" | "semiannually" | "annually" | "biennially" | "triennially" | "one_time";
export type ProductType = "hosting" | "server" | "domain" | "sms" | "software" | "service";

export interface ProductGroup {
  id: string;
  name: string;
  slug: string;
  type: ProductType;
  typeLabel: string;
  description: string | null;
  sortOrder: number;
  /** Off: hidden from the public catalog. */
  isActive: boolean;
  productsCount: number;
}

export interface ProductGroupInput {
  name: string;
  type: ProductType;
  description: string | null;
  isActive: boolean;
  sortOrder?: number;
}

export interface ProductPrice {
  cycle: BillingCycle;
  label: string;
  /** null for a one-time payment. */
  months: number | null;
  /** Paisa, for the whole cycle. */
  amount: number;
  /** The "regular" price shown struck through on the site (paisa). null = none. */
  compareAmount: number | null;
}

/** A section of the plan comparison on the pricing page (Primary, Server, Security...). */
export interface FeatureGroup {
  title: string;
  items: string[];
}

export interface Product {
  id: string;
  groupId: string;
  groupName: string | null;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  features: string[];
  featureGroups: FeatureGroup[];
  /** Paisa, charged once. */
  setupFee: number;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  /** Shortest cycle first. */
  prices: ProductPrice[];
}

export interface ProductInput {
  groupId: string;
  name: string;
  tagline: string | null;
  description: string | null;
  features: string[];
  featureGroups: FeatureGroup[];
  setupFee: number;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder?: number;
  prices: { cycle: BillingCycle; amount: number; compareAmount?: number | null }[];
}

export type ProductCounts = Record<"all" | "active" | "inactive", number>;

/** GET /api/admin/products: a Laravel paginated collection with `counts` in meta (for the tabs). */
export type ProductsIndexResponse = PaginatedResource<Product, { counts: ProductCounts }>;

export interface ProductsParams {
  /** 1-based. */
  page: number;
  status: "all" | "active" | "inactive";
  /** A group id, or "all". */
  group: string;
  search: string;
}

export interface ProductsPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  counts: ProductCounts;
}

/** GET /api/admin/products/options: what the product form needs. */
export interface ProductOptions {
  groups: ProductGroup[];
  cycles: { value: BillingCycle; label: string; months: number | null }[];
  types: { value: ProductType; label: string }[];
  currency: string;
  /** `rate` is a percent. `inclusive`: the prices already contain the tax. */
  tax: { label: string; rate: number; inclusive: boolean };
}
