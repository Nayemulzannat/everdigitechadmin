import { Card, CardLink, ResponsiveTable, Skeleton, StatusPill, type StatusTone, type TableColumn } from "@/components/ui";
import type { OrderStatus, RecentOrder } from "@/lib/api/dashboard";
import { formatBDT, formatTimeAgo } from "@/lib/format";

const STATUS: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  active: { label: "Active", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  verify_payment: { label: "Verify payment", tone: "warning" },
  unpaid: { label: "Unpaid", tone: "neutral" },
};

const paymentLabel = (order: RecentOrder) => (order.paymentMethod ? `via ${order.paymentMethod}` : "Not paid");

function OrderStatusPill({ status }: { status: OrderStatus }) {
  return <StatusPill tone={STATUS[status].tone}>{STATUS[status].label}</StatusPill>;
}

function columns(asOf: string): TableColumn<RecentOrder>[] {
  return [
    {
      id: "order",
      header: "Order",
      cellClassName: "font-bold whitespace-nowrap text-primary",
      cell: (o) => `#${o.id}`,
    },
    {
      id: "client",
      header: "Client",
      cell: (o) => (
        <>
          <div className="font-bold">{o.client}</div>
          <div className="text-xs text-text-muted">{formatTimeAgo(o.placedAt, asOf)}</div>
        </>
      ),
    },
    {
      id: "product",
      header: "Product",
      cell: (o) => (
        <>
          <div className="font-semibold">{o.product}</div>
          <div className="text-xs text-text-muted">{paymentLabel(o)}</div>
        </>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      cellClassName: "font-bold whitespace-nowrap tabular-nums",
      cell: (o) => formatBDT(o.amount),
    },
    { id: "status", header: "Status", cellClassName: "whitespace-nowrap", cell: (o) => <OrderStatusPill status={o.status} /> },
  ];
}

/** Phone card: id + status · client + product · amount + payment method. */
function OrderCard({ order, asOf }: { order: RecentOrder; asOf: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold whitespace-nowrap text-primary">#{order.id}</span>
        <OrderStatusPill status={order.status} />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-bold">
          {order.client} <span className="font-normal text-text-muted">· {formatTimeAgo(order.placedAt, asOf)}</span>
        </span>
        <span className="truncate text-[13px] text-text-secondary">{order.product}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-bold tabular-nums">{formatBDT(order.amount)}</span>
        <span className="truncate text-xs text-text-muted">{paymentLabel(order)}</span>
      </div>
    </div>
  );
}

export function RecentOrders({ orders, asOf }: { orders: RecentOrder[]; asOf: string }) {
  return (
    <Card padding="none" title="Recent orders" action={<CardLink href="/orders">All orders</CardLink>}>
      <ResponsiveTable
        caption="Recent orders"
        columns={columns(asOf)}
        rows={orders}
        getRowKey={(o) => o.id}
        renderMobileRow={(o) => <OrderCard order={o} asOf={asOf} />}
        minWidth={600}
        compact
      />
    </Card>
  );
}

export function RecentOrdersSkeleton() {
  return (
    <Card padding="none">
      <div className="flex items-center justify-between border-b border-border px-4 py-4 md:px-6 md:py-5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex flex-col gap-3 p-3 sm:p-4 md:gap-0 md:p-0">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-control border border-border p-4 md:flex-row md:items-center md:gap-6 md:rounded-none md:border-0 md:border-t md:border-divider md:px-5 md:first:border-t-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full md:w-40" />
            <Skeleton className="hidden h-4 w-48 md:block" />
            <Skeleton className="h-4 w-20 md:ml-auto" />
            <Skeleton className="hidden h-6 w-20 rounded-pill md:block" />
          </div>
        ))}
      </div>
    </Card>
  );
}
