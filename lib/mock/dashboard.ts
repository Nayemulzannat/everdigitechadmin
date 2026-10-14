import type { DashboardRange, DashboardSummary, NewOrdersStat, RevenueStat } from "@/types/dashboard";
import { formatBDT } from "@/lib/format";

// Sample data from design/Main.dc.html ("Last 30 days"). The Today and This year numbers are made up so the
// range control visibly changes something; everything else is point-in-time and the same for every range.

const AS_OF = "2026-10-02T09:30:00+06:00";
const minutesBefore = (minutes: number) => new Date(Date.parse(AS_OF) - minutes * 60_000).toISOString();

const RANGE_STATS: Record<DashboardRange, { revenue: RevenueStat; newOrders: NewOrdersStat }> = {
  today: { revenue: { amount: 18_450, changePercent: 6.2 }, newOrders: { count: 7, pendingApproval: 6 } },
  "30d": { revenue: { amount: 482_350, changePercent: 12.4 }, newOrders: { count: 138, pendingApproval: 6 } },
  year: { revenue: { amount: 48_62_300, changePercent: 18.9 }, newOrders: { count: 1_486, pendingApproval: 6 } },
};

const BASE: Omit<DashboardSummary, "range" | "revenue" | "newOrders"> = {
  asOf: AS_OF,
  unpaidInvoices: { amount: 1_24_900, count: 21, overdue: 7 },
  openTickets: { count: 14, urgent: 3, avgReplyMinutes: 80 },
  revenueByMonth: [
    { month: "2025-10", amount: 298_000 },
    { month: "2025-11", amount: 312_000 },
    { month: "2025-12", amount: 305_000 },
    { month: "2026-01", amount: 341_000 },
    { month: "2026-02", amount: 326_000 },
    { month: "2026-03", amount: 359_000 },
    { month: "2026-04", amount: 372_000 },
    { month: "2026-05", amount: 365_000 },
    { month: "2026-06", amount: 398_000 },
    { month: "2026-07", amount: 412_000 },
    { month: "2026-08", amount: 405_000 },
    { month: "2026-09", amount: 482_000 },
  ],
  attention: [
    {
      id: "pending-orders",
      kind: "orders",
      severity: "warning",
      title: "6 orders waiting for approval",
      detail: "Oldest placed 9 hours ago",
      actionLabel: "Review",
      href: "/orders?status=pending",
    },
    {
      id: "overdue-invoices",
      kind: "invoices",
      severity: "danger",
      title: "7 invoices overdue",
      detail: `${formatBDT(38_400)} total · 2 will auto-suspend tomorrow`,
      actionLabel: "View",
      href: "/invoices?status=overdue",
    },
    {
      id: "expiring-domains",
      kind: "domains",
      severity: "info",
      title: "12 domains expire in 7 days",
      detail: "4 have auto-renew turned off",
      actionLabel: "View",
      href: "/domains?expiring=7d",
    },
    {
      id: "failed-provisioning",
      kind: "provisioning",
      severity: "danger",
      title: "2 provisioning jobs failed",
      detail: "cPanel API timeout on SG-01",
      actionLabel: "Retry",
      href: "/hosting?provisioning=failed",
    },
    {
      id: "sg01-disk",
      kind: "server",
      severity: "warning",
      title: "SG-01 disk at 91%",
      detail: "Stop new accounts on this server",
      actionLabel: "Open",
      href: "/servers/sg-01",
    },
  ],
  recentOrders: [
    { id: "ORD-10482", client: "Rahim Uddin", placedAt: minutesBefore(12), product: "Business Hosting · Yearly", paymentMethod: "bKash", amount: 6_500, status: "active" },
    { id: "ORD-10481", client: "Nusrat Jahan", placedAt: minutesBefore(48), product: "Domain · nusratbakes.com", paymentMethod: "SSLCommerz", amount: 1_450, status: "pending" },
    { id: "ORD-10480", client: "TechNest Ltd", placedAt: minutesBefore(120), product: "VPS Pro · Monthly", paymentMethod: "Bank transfer", amount: 4_200, status: "verify_payment" },
    { id: "ORD-10479", client: "Sabbir Hossain", placedAt: minutesBefore(180), product: "Starter Hosting · Yearly", paymentMethod: "Nagad", amount: 1_200, status: "active" },
    { id: "ORD-10478", client: "Farhana Akter", placedAt: minutesBefore(300), product: "Domain · akterfashion.com.bd", paymentMethod: null, amount: 1_800, status: "unpaid" },
  ],
  servers: [
    { id: "bd-01", name: "BD-01", location: "Dhaka", panel: "cPanel", accounts: 342, capacity: 500, cpu: 48, disk: 63, status: "online" },
    { id: "us-01", name: "US-01", location: "Dallas", panel: "cPanel", accounts: 210, capacity: 400, cpu: 31, disk: 52, status: "online" },
    { id: "sg-01", name: "SG-01", location: "Singapore", panel: "DirectAdmin", accounts: 188, capacity: 250, cpu: 72, disk: 91, status: "disk_high" },
  ],
};

/** Resolves after a short delay so the skeletons are visible during development. */
export async function getMockDashboardSummary(range: DashboardRange): Promise<DashboardSummary> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return { ...BASE, range, ...RANGE_STATS[range] };
}
