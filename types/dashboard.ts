// GET /api/admin/dashboard/summary?range= → ApiResource<DashboardSummary>

export type DashboardRange = "today" | "30d" | "year";

export interface RevenueStat {
  /** Paid invoices in the range, in BDT. */
  amount: number;
  /** Change against the previous period of the same length, in percent. */
  changePercent: number;
}

export interface NewOrdersStat {
  count: number;
  /** Orders waiting for staff approval right now (not range-dependent). */
  pendingApproval: number;
}

export interface UnpaidInvoicesStat {
  amount: number;
  count: number;
  overdue: number;
}

export interface OpenTicketsStat {
  count: number;
  urgent: number;
  avgReplyMinutes: number;
}

export interface MonthlyRevenue {
  /** "YYYY-MM" */
  month: string;
  amount: number;
}

export type AttentionKind = "orders" | "invoices" | "domains" | "provisioning" | "server";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  severity: "warning" | "danger" | "info";
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
}

export type OrderStatus = "active" | "pending" | "verify_payment" | "unpaid";

export interface RecentOrder {
  id: string;
  client: string;
  /** ISO timestamp. */
  placedAt: string;
  product: string;
  /** null when the order hasn't been paid. */
  paymentMethod: string | null;
  amount: number;
  status: OrderStatus;
}

export type ServerStatus = "online" | "disk_high" | "offline";

export interface ServerSummary {
  id: string;
  name: string;
  location: string;
  panel: string;
  accounts: number;
  capacity: number;
  /** Percent, 0–100. */
  cpu: number;
  disk: number;
  status: ServerStatus;
}

export interface DashboardSummary {
  /** When the summary was computed (ISO). Drives the date line, greeting and "x min ago" labels. */
  asOf: string;
  range: DashboardRange;
  revenue: RevenueStat;
  newOrders: NewOrdersStat;
  unpaidInvoices: UnpaidInvoicesStat;
  openTickets: OpenTicketsStat;
  /** Last 12 months, oldest first. Not range-dependent. */
  revenueByMonth: MonthlyRevenue[];
  attention: AttentionItem[];
  recentOrders: RecentOrder[];
  servers: ServerSummary[];
}
