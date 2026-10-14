import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type SkeletonProps = ComponentProps<"div"> & {
  /** Render a <span> (display: inline-block) so it can sit inside headings and other phrasing content. */
  as?: "div" | "span";
};

/** Grey placeholder block shown while content loads. Pulses only when the user allows motion. */
export function Skeleton({ as: Tag = "div", className, ...props }: SkeletonProps) {
  return (
    <Tag
      aria-hidden="true"
      className={cn("rounded-md bg-neutral-soft motion-safe:animate-pulse", Tag === "span" && "inline-block", className)}
      {...props}
    />
  );
}
