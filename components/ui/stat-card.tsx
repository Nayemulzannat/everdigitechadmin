import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "./card";
import { Skeleton } from "./skeleton";

/** Stat-card grid: 1 column on small phones, 2 from 480px, 4 from xl. */
export const STAT_GRID = "grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4";

export interface StatCardProps {
  label: string;
  icon: ReactNode;
  /** warning colours the icon; with `tinted` it colours the whole card (a call to attention). */
  tone?: "primary" | "warning";
  tinted?: boolean;
  value: string;
  footnote: ReactNode;
}

export function StatCard({ label, icon, tone = "primary", tinted = false, value, footnote }: StatCardProps) {
  return (
    // @container: the value shrinks from 28px to 24px when the card itself is narrow, whatever the viewport.
    <Card padding="md" className={cn("@container gap-3 md:gap-3", tinted && "border-warning-border bg-warning-soft")}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={cn("truncate text-[13px] font-bold", tinted ? "text-warning" : "text-text-muted")}>{label}</h2>
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-nav [&_svg]:size-4",
            tone === "warning" ? "bg-warning-soft text-warning" : "bg-info-soft text-primary",
            tinted && "bg-surface/70",
          )}
        >
          {icon}
        </span>
      </div>
      <p className="truncate text-2xl font-extrabold tracking-[-0.02em] tabular-nums @[13rem]:text-[28px]">{value}</p>
      <p className={cn("text-[13px]", tinted ? "text-warning-text" : "text-text-muted")}>{footnote}</p>
    </Card>
  );
}

/** Placeholder with the same grid, one card per `count`. */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={STAT_GRID}>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} padding="md" className="gap-3 md:gap-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-8 rounded-nav" />
          </div>
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-44 max-w-full" />
        </Card>
      ))}
    </div>
  );
}
