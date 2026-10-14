import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

const tones: Record<StatusTone, { pill: string; dot: string }> = {
  success: { pill: "bg-success-soft text-success", dot: "bg-success" },
  warning: { pill: "bg-warning-soft text-warning", dot: "bg-warning" },
  danger: { pill: "bg-danger-soft text-danger", dot: "bg-danger" },
  neutral: { pill: "bg-neutral-soft text-neutral", dot: "bg-neutral-dot" },
  info: { pill: "bg-info-soft text-info", dot: "bg-info" },
};

export type StatusPillProps = ComponentProps<"span"> & {
  tone?: StatusTone;
  /** The 6px status dot. On by default. */
  dot?: boolean;
};

export function StatusPill({ tone = "neutral", dot = true, className, children, ...props }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-bold whitespace-nowrap",
        tones[tone].pill,
        className,
      )}
      {...props}
    >
      {dot ? <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-pill", tones[tone].dot)} /> : null}
      {children}
    </span>
  );
}
