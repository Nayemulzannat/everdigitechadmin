import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type BadgeProps = Omit<ComponentProps<"span">, "children"> & {
  count: number;
  /** Counts above this show as "99+". */
  max?: number;
};

/** Count badge, white on primary (nav items, tabs). */
export function Badge({ count, max = 99, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-w-6 shrink-0 items-center justify-center rounded-pill bg-primary px-2 py-0.5 text-xs font-bold text-on-primary tabular-nums",
        className,
      )}
      {...props}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
}
