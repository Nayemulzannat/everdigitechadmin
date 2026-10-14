import { Card, CardLink, Skeleton, StatusPill, type StatusTone } from "@/components/ui";
import type { ServerStatus, ServerSummary } from "@/lib/api/dashboard";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";

const STATUS: Record<ServerStatus, { label: string; tone: StatusTone }> = {
  online: { label: "Online", tone: "success" },
  disk_high: { label: "Disk high", tone: "danger" },
  offline: { label: "Offline", tone: "danger" },
};

/** Usage bar colour: primary below 70%, warning from 70%, danger from 85%. */
function usageColor(percent: number) {
  if (percent >= 85) return "bg-danger";
  if (percent >= 70) return "bg-warning";
  return "bg-primary";
}

function UsageRow({ label, percent, server }: { label: string; percent: number; server: string }) {
  const value = Math.min(100, Math.max(0, percent));
  return (
    <>
      <span>{label}</span>
      <div
        role="meter"
        aria-label={`${server} ${label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value}%`}
        className="h-1.5 rounded-pill bg-chart-grid"
      >
        <div className={cn("h-full rounded-pill", usageColor(value))} style={{ width: `${value}%` }} />
      </div>
      <span className="text-right font-bold text-text tabular-nums">{value}%</span>
    </>
  );
}

export function ServersCard({ servers }: { servers: ServerSummary[] }) {
  return (
    <Card title="Servers" action={<CardLink href="/servers">Manage</CardLink>} className="gap-4 md:gap-[18px]">
      <ul className="flex flex-col gap-4">
        {servers.map((s) => (
          <li key={s.id} className="flex flex-col gap-2.5 border-b border-divider pb-4 last:border-b-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-extrabold">{s.name}</span>
                <span className="text-xs text-text-muted">
                  {s.location} · {s.panel} · {formatCount(s.accounts)} / {formatCount(s.capacity)} accounts
                </span>
              </div>
              <StatusPill tone={STATUS[s.status].tone} dot={false} className="shrink-0">
                {STATUS[s.status].label}
              </StatusPill>
            </div>
            <div className="grid grid-cols-[44px_minmax(0,1fr)_40px] items-center gap-x-2.5 gap-y-1.5 text-xs text-text-muted">
              <UsageRow label="CPU" percent={s.cpu} server={s.name} />
              <UsageRow label="Disk" percent={s.disk} server={s.name} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ServersCardSkeleton() {
  return (
    <Card className="gap-4 md:gap-[18px]">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2.5 border-b border-divider pb-4 last:border-b-0 last:pb-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <Skeleton className="h-6 w-16 rounded-pill" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-pill" />
          <Skeleton className="h-1.5 w-full rounded-pill" />
        </div>
      ))}
    </Card>
  );
}
