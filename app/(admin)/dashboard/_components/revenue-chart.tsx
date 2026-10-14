"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardLink, SegmentedControl, Skeleton } from "@/components/ui";
import type { MonthlyRevenue } from "@/lib/api/dashboard";
import { cn } from "@/lib/cn";
import { formatBDT, formatLakh, formatMonthKey } from "@/lib/format";

type Period = "6" | "12";

const TICKS = 5;
// Same height for the axis and the plot so tick labels line up with the grid lines.
const PLOT_HEIGHT = "h-40 sm:h-50";

/** Axis top: the highest month rounded up to a whole lakh (৳1L minimum). */
function axisMax(months: MonthlyRevenue[]) {
  const highest = Math.max(0, ...months.map((m) => m.amount));
  return Math.max(100_000, Math.ceil(highest / 100_000) * 100_000);
}

function describe(months: MonthlyRevenue[]) {
  const first = months[0];
  const last = months[months.length - 1];
  if (!first || !last) return "No revenue data.";
  const best = months.reduce((a, b) => (b.amount > a.amount ? b : a));
  return (
    `Monthly revenue from ${formatMonthKey(first.month).long} to ${formatMonthKey(last.month).long}: ` +
    `${formatBDT(first.amount)} in ${formatMonthKey(first.month).short}, ${formatBDT(last.amount)} in ${formatMonthKey(last.month).short}. ` +
    `Highest: ${formatMonthKey(best.month).long}, ${formatBDT(best.amount)}.`
  );
}

/**
 * Bar chart built from divs. Phones (below sm) show the last 6 months unless "12M" is picked; from sm all 12 show.
 * Values appear in a tooltip on hover (mouse) or tap (touch); the whole chart has a text summary for screen readers.
 */
/** `showReportLink`: the "Open report" link, for staff who can open Reports. */
export function RevenueChart({ months, showReportLink = true }: { months: MonthlyRevenue[]; showReportLink?: boolean }) {
  const [period, setPeriod] = useState<Period>("6");
  const [active, setActive] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  // A tap anywhere outside the bars closes the tooltip.
  useEffect(() => {
    if (active === null) return;
    function onPointerDown(event: PointerEvent) {
      if (!plotRef.current?.contains(event.target as Node)) setActive(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [active]);

  const max = axisMax(months);
  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => (max / TICKS) * (TICKS - i));
  const firstShownOnPhone = period === "6" ? Math.max(0, months.length - 6) : 0;

  return (
    <Card
      title={
        <>
          Revenue, last{" "}
          {period === "6" ? (
            <>
              <span className="sm:hidden">6</span>
              <span className="max-sm:hidden">12</span>
            </>
          ) : (
            "12"
          )}{" "}
          months
        </>
      }
      description="Paid invoices only, in BDT"
      action={showReportLink ? <CardLink href="/reports">Open report</CardLink> : undefined}
    >
      <SegmentedControl
        aria-label="Months shown"
        value={period}
        onValueChange={(value) => {
          setActive(null);
          setPeriod(value);
        }}
        items={[
          { value: "6", label: "6M" },
          { value: "12", label: "12M" },
        ]}
        className="-mt-1 self-end sm:hidden"
      />

      <div role="img" aria-label={describe(months)} className="flex gap-2 pt-2 sm:gap-3">
        {/* Y axis */}
        <div aria-hidden="true" className={cn("relative w-9 shrink-0 text-xs text-text-muted tabular-nums", PLOT_HEIGHT)}>
          {ticks.map((value, i) => (
            <span key={value} className="absolute right-0 translate-y-1/2" style={{ bottom: `${((TICKS - i) / TICKS) * 100}%` }}>
              {formatLakh(value)}
            </span>
          ))}
        </div>

        <div ref={plotRef} className="relative min-w-0 flex-1">
          {/* Grid lines; the baseline is darker. */}
          <div aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 top-0", PLOT_HEIGHT)}>
            {ticks.map((value, i) => (
              <span
                key={value}
                className={cn("absolute inset-x-0 h-px", i === TICKS ? "bg-input-border" : "bg-chart-grid")}
                style={{ bottom: `${((TICKS - i) / TICKS) * 100}%` }}
              />
            ))}
          </div>

          <div className="relative flex justify-between gap-1.5 sm:gap-2.5">
            {months.map((m, i) => {
              const label = formatMonthKey(m.month);
              const isLast = i === months.length - 1;
              const isActive = active === i;
              const hiddenOnPhone = i < firstShownOnPhone;
              // With 12 bars on a phone, label every other month (counting back from the latest) so they don't overlap.
              const labelHiddenOnPhone = period === "12" && (months.length - 1 - i) % 2 === 1;
              const align = i < 2 ? "left-0" : i > months.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2";

              return (
                <div key={m.month} className={cn("flex min-w-0 max-w-10 flex-1 flex-col items-center gap-2.5", hiddenOnPhone && "max-sm:hidden")}>
                  {/* The whole column is the hit area, so short bars are still easy to tap. */}
                  <div
                    className={cn("relative flex w-full cursor-pointer items-end", PLOT_HEIGHT)}
                    onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                    onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
                    onClick={() => setActive(i)}
                  >
                    <div
                      className={cn(
                        "w-full rounded-t-md transition-colors",
                        isLast ? "bg-primary" : isActive ? "bg-primary/45" : "bg-chart-light",
                        isLast && isActive && "bg-primary-hover",
                      )}
                      style={{ height: `${(m.amount / max) * 100}%` }}
                    />
                    {isActive ? (
                      <div
                        className={cn(
                          "pointer-events-none absolute z-10 mb-2 rounded-lg bg-text px-2.5 py-1.5 text-xs whitespace-nowrap text-on-primary shadow-lg",
                          align,
                        )}
                        style={{ bottom: `${(m.amount / max) * 100}%` }}
                      >
                        <span className="block text-on-primary-subtle">{label.long}</span>
                        <span className="font-bold tabular-nums">{formatBDT(m.amount)}</span>
                      </div>
                    ) : null}
                  </div>
                  <span aria-hidden="true" className={cn("text-xs text-text-muted", labelHiddenOnPhone && "max-sm:invisible")}>
                    {label.short}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Fixed heights so the skeleton looks like a chart without random values (and renders the same on server and client).
const SKELETON_BARS = [58, 62, 60, 68, 64, 72, 74, 72, 80, 82, 81, 96];

export function RevenueChartSkeleton() {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-52 max-w-full" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
      <div className={cn("flex items-end justify-between gap-1.5 pl-11 sm:gap-2.5 sm:pl-12", PLOT_HEIGHT)}>
        {SKELETON_BARS.map((h, i) => (
          <Skeleton key={i} className={cn("max-w-10 flex-1 rounded-b-none", i < 6 && "max-sm:hidden")} style={{ height: `${h}%` }} />
        ))}
      </div>
    </Card>
  );
}
