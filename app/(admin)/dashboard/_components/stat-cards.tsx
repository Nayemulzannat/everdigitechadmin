import type { ReactNode } from "react";
import { FileText, MessageSquare, ShoppingBag, TrendingUp } from "lucide-react";
import { STAT_GRID, StatCard, StatCardsSkeleton } from "@/components/ui/stat-card";
import type { DashboardRange, DashboardSummary } from "@/lib/api/dashboard";
import { cn } from "@/lib/cn";
import { formatBDT, formatChange, formatCount, formatDuration } from "@/lib/format";

const COMPARISON: Record<DashboardRange, string> = {
  today: "vs yesterday",
  "30d": "vs previous 30 days",
  year: "vs last year",
};

const strong = (className: string, children: ReactNode) => <span className={cn("font-bold", className)}>{children}</span>;

export function StatCards({ summary, stale = false }: { summary: DashboardSummary; stale?: boolean }) {
  const { revenue, newOrders, unpaidInvoices, openTickets } = summary;

  return (
    <div aria-busy={stale || undefined} className={cn(STAT_GRID, "transition-opacity", stale && "opacity-60")}>
      <StatCard
        label="Revenue"
        icon={<TrendingUp strokeWidth={2} />}
        value={formatBDT(revenue.amount)}
        footnote={
          <>
            {strong(revenue.changePercent < 0 ? "text-danger" : "text-success", formatChange(revenue.changePercent))}{" "}
            {COMPARISON[summary.range]}
          </>
        }
      />
      <StatCard
        label="New orders"
        icon={<ShoppingBag strokeWidth={2} />}
        value={formatCount(newOrders.count)}
        footnote={<>{strong("text-warning", `${formatCount(newOrders.pendingApproval)} pending`)} approval</>}
      />
      <StatCard
        label="Unpaid invoices"
        tone="warning"
        icon={<FileText strokeWidth={2} />}
        value={formatBDT(unpaidInvoices.amount)}
        footnote={
          <>
            {formatCount(unpaidInvoices.count)} invoices · {strong("text-danger", `${formatCount(unpaidInvoices.overdue)} overdue`)}
          </>
        }
      />
      <StatCard
        label="Open tickets"
        icon={<MessageSquare strokeWidth={2} />}
        value={formatCount(openTickets.count)}
        footnote={
          <>
            {strong("text-danger", `${formatCount(openTickets.urgent)} urgent`)} · avg. reply {formatDuration(openTickets.avgReplyMinutes)}
          </>
        }
      />
    </div>
  );
}

export { StatCardsSkeleton };
