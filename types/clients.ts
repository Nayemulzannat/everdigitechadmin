import type { PaginatedResource } from "./api";

export type ClientStatus = "active" | "inactive" | "closed";
export type ClientGroup = "regular" | "reseller" | "vip";

export interface Client {
  id: string;
  name: string;
  email: string;
  /** null when the client has no company. */
  company: string | null;
  services: number;
  domains: number;
  /** Unpaid balance in BDT; 0 when nothing is due. */
  balanceDue: number;
  /** True when some of the balance is past its due date. */
  overdue: boolean;
  group: ClientGroup;
  status: ClientStatus;
  /** "YYYY-MM-DD" */
  joinedOn: string;
}

/** Query string for GET /api/admin/clients. "all" and empty values are omitted. */
export interface ClientsParams {
  /** 1-based. */
  page: number;
  status: ClientStatus | "all";
  group: ClientGroup | "all";
  search: string;
}

export type ClientCounts = Record<ClientStatus | "all", number>;

/** GET /api/admin/clients: a Laravel paginated collection with per-status `counts` in meta (for the tabs). */
export type ClientsIndexResponse = PaginatedResource<Client, { counts: ClientCounts }>;

/** What the app works with after unwrapping the paginator. */
export interface ClientsPage {
  items: Client[];
  /** Matches for the current status/group/search. */
  total: number;
  /** The page actually returned (clamped to the last page). */
  page: number;
  pageSize: number;
  pageCount: number;
  /** Per-status totals for the current group and search, for the tab counts. */
  counts: ClientCounts;
}

/** GET /api/admin/clients/{id}: one client for its page. */
export interface ClientDetail {
  id: string;
  name: string;
  company: string | null;
  group: ClientGroup;
  status: ClientStatus;
  notes: string | null;
  creditBalance: number;
  /** "YYYY-MM-DD" */
  joinedOn: string;
  owner: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    emailVerified: boolean;
    phoneVerified: boolean;
    twoFactorOn: boolean;
    suspended: boolean;
    lastLoginAt: string | null;
  } | null;
  members: { id: string; userId: string; name: string | null; email: string | null; role: "owner" | "member"; status: "active" | "invited" | "suspended"; joinedAt: string | null; lastLoginAt: string | null }[];
  stats: { services: number; balanceDue: number; overdue: boolean; domains: number; domainsEndingSoon: number; tickets: number; ticketsOpen: number };
  recentTickets: { id: string; number: string; subject: string; status: "open" | "answered" | "closed"; priority: "low" | "medium" | "high"; lastReplyAt: string | null }[];
  recentDomains: { id: string; name: string; status: string; expiresAt: string | null }[];
  recentLogins: { id: string; userName: string | null; ip: string | null; browser: string | null; platform: string | null; successful: boolean; failureReason: string | null; impersonated: boolean; createdAt: string }[];
}

export interface ClientUpdateInput {
  name?: string;
  company?: string | null;
  group?: ClientGroup;
  status?: ClientStatus;
  notes?: string | null;
}
