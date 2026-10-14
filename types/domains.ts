import type { PaginatedResource } from "./api";

export type DomainStatus = "pending" | "active" | "expired" | "cancelled";

export interface Domain {
  id: string;
  name: string;
  account: { id: string; name: string | null };
  registrar: "manual" | "dynadot";
  status: DomainStatus;
  /** "YYYY-MM-DD" */
  registeredAt: string | null;
  expiresAt: string | null;
  /** Days until it expires, negative once it has. null without a date. */
  daysLeft: number | null;
  autoRenew: boolean;
  locked: boolean;
  whoisPrivacy: boolean;
  nameservers: string[];
  notes: string | null;
  /** Only on the detail. */
  events?: { type: string; by: string | null; properties: Record<string, unknown> | null; createdAt: string }[];
}

export interface DomainInput {
  accountId: number;
  name: string;
  registrar: "manual" | "dynadot";
  status: DomainStatus;
  registeredAt: string | null;
  expiresAt: string | null;
  autoRenew: boolean;
  locked: boolean;
  whoisPrivacy: boolean;
  nameservers: string[];
  notes: string | null;
}

export type DomainFilter = DomainStatus | "all" | "expiring";
export type DomainCounts = Record<DomainFilter, number>;

export type DomainsIndexResponse = PaginatedResource<Domain, { counts: DomainCounts }>;

export interface DomainsPage {
  items: Domain[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  counts: DomainCounts;
}

export interface DomainsParams {
  page: number;
  status: DomainFilter;
  search: string;
}

/**
 * An extension. Prices are paisa; null = none typed. `effective*` is what the client pays before tax: the price typed, or worked
 * out from the registrar's cost by the pricing rule (null = no price: the website says "Ask for price"). `cost*` is US cents.
 */
export interface DomainExtension {
  id: string;
  extension: string;
  tag: string | null;
  registerPrice: number | null;
  renewPrice: number | null;
  transferPrice: number | null;
  effectiveRegisterPrice: number | null;
  effectiveRenewPrice: number | null;
  effectiveTransferPrice: number | null;
  priceSource: "manual" | "auto" | null;
  costRegister: number | null;
  costRenew: number | null;
  costTransfer: number | null;
  usage: string | null;
  /** Who may register it (some accept only people or companies of one country); null = anyone. */
  restrictions: string | null;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface DomainExtensionInput {
  extension: string;
  tag: string | null;
  registerPrice: number | null;
  renewPrice: number | null;
  transferPrice: number | null;
  isFeatured: boolean;
  isActive: boolean;
}

export type ExtensionFilter = "all" | "on" | "off" | "no_price" | "popular";

export interface ExtensionsParams {
  page: number;
  status: ExtensionFilter;
  search: string;
}

export interface ExtensionsPage {
  items: DomainExtension[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  counts: Record<ExtensionFilter, number>;
}

/** Cost x `usdRate` taka per dollar x (1 + `marginPercent`), rounded up to a multiple of `roundTo` taka. */
export interface DomainPricingRule {
  usdRate: number | null;
  marginPercent: number;
  roundTo: number;
}
