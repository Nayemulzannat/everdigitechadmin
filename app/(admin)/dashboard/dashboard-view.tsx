"use client";

import { useState } from "react";
import { Alert, Button, SegmentedControl, Skeleton } from "@/components/ui";
import { useAuth } from "@/components/auth";
import { PageHeader, useCurrentUser } from "@/components/layout";
import { useDashboardSummary, type AttentionKind, type DashboardRange } from "@/lib/api/dashboard";
import { cn } from "@/lib/cn";
import type { PermissionKey } from "@/types/permissions";
import { formatLongDate, greetingFor } from "@/lib/format";
import { AttentionList, AttentionListSkeleton } from "./_components/attention-list";
import { RecentOrders, RecentOrdersSkeleton } from "./_components/recent-orders";
import { RevenueChart, RevenueChartSkeleton } from "./_components/revenue-chart";
import { ServersCard, ServersCardSkeleton } from "./_components/servers-card";
import { StatCards, StatCardsSkeleton } from "./_components/stat-cards";

const RANGES: { value: DashboardRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "30d", label: "Last 30 days" },
  { value: "year", label: "This year" },
];

// xl: two thirds / one third. Below xl the cards stack, the wide one first.
const SPLIT = "grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]";
// When one card of a pair is hidden by permissions, the other takes the full width.
const SINGLE = "grid grid-cols-1 gap-4";

/** "Needs attention" items link into these sections, so each needs that section's permission. */
const ATTENTION_PERMISSION: Record<AttentionKind, PermissionKey> = {
  orders: "orders.view",
  invoices: "invoices.view",
  domains: "domains.view",
  provisioning: "services.view",
  server: "servers.view",
};

export function DashboardView() {
  const user = useCurrentUser();
  const { can } = useAuth();
  const showOrders = can("orders.view");
  const showServers = can("servers.view");
  const firstName = user.name.split(" ")[0];
  const [range, setRange] = useState<DashboardRange>("30d");
  const { data, isPending, isError, isPlaceholderData, refetch, isRefetching } = useDashboardSummary(range);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        eyebrow={data ? formatLongDate(data.asOf) : <Skeleton as="span" className="h-3.5 w-44 bg-border align-middle" />}
        title={
          data ? (
            `${greetingFor(data.asOf)}, ${firstName}`
          ) : (
            <>
              <span className="sr-only">Dashboard</span>
              <Skeleton as="span" className="h-8 w-72 max-w-full bg-border align-middle" />
            </>
          )
        }
        description="Here is what needs your attention across clients, billing and servers today."
        actions={
          <SegmentedControl
            aria-label="Date range"
            track="page"
            value={range}
            onValueChange={setRange}
            items={RANGES}
            className="max-md:w-full"
            itemClassName="max-md:flex-1 max-md:justify-center"
          />
        }
      />

      {isError && !data ? (
        <Alert
          tone="danger"
          role="alert"
          title="The dashboard couldn't be loaded"
        >
          <div className="flex flex-col items-start gap-3">
            <span>Check your connection and try again.</span>
            <Button variant="secondary" size="sm" loading={isRefetching} onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        </Alert>
      ) : isPending ? (
        <div role="status" aria-label="Loading dashboard" className="flex flex-col gap-4 md:gap-6">
          <StatCardsSkeleton />
          <div className={SPLIT}>
            <RevenueChartSkeleton />
            <AttentionListSkeleton />
          </div>
          <div className={SPLIT}>
            <RecentOrdersSkeleton />
            <ServersCardSkeleton />
          </div>
        </div>
      ) : (
        <>
          <StatCards summary={data} stale={isPlaceholderData} />
          <div className={SPLIT}>
            <RevenueChart months={data.revenueByMonth} showReportLink={can("reports.view")} />
            <AttentionList items={data.attention.filter((item) => can(ATTENTION_PERMISSION[item.kind]))} />
          </div>
          {showOrders || showServers ? (
            <div className={cn(showOrders && showServers ? SPLIT : SINGLE)}>
              {showOrders ? <RecentOrders orders={data.recentOrders} asOf={data.asOf} /> : null}
              {showServers ? <ServersCard servers={data.servers} /> : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
