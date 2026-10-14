import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

type PageItem = number | "start-ellipsis" | "end-ellipsis";

/** Page numbers to show: first, last, the current page with `siblings` on each side, and ellipses for gaps. */
export function getPageItems(page: number, pageCount: number, siblings = 1): PageItem[] {
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  // first + last + current + siblings on both sides + two ellipses
  if (pageCount <= siblings * 2 + 5) return range(1, pageCount);

  const left = Math.max(page - siblings, 2);
  const right = Math.min(page + siblings, pageCount - 1);
  const showStart = left > 3;
  const showEnd = right < pageCount - 2;

  if (!showStart) return [...range(1, 3 + siblings * 2), "end-ellipsis", pageCount];
  if (!showEnd) return [1, "start-ellipsis", ...range(pageCount - 2 - siblings * 2, pageCount)];
  return [1, "start-ellipsis", ...range(left, right), "end-ellipsis", pageCount];
}

export type PaginationProps = Omit<ComponentProps<"nav">, "onChange"> & {
  /** Current page, 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Pages shown either side of the current one from md up. */
  siblings?: number;
};

/** Phones: Previous · "Page X of Y" · Next. From md: Previous · page numbers · Next. */
export function Pagination({ page, pageCount, onPageChange, siblings = 1, className, ...props }: PaginationProps) {
  const count = Math.max(1, pageCount);
  const current = Math.min(Math.max(1, page), count);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex w-full items-center justify-between gap-1.5 md:w-auto md:justify-start", className)}
      {...props}
    >
      <Button variant="secondary" size="sm" disabled={current <= 1} onClick={() => onPageChange(current - 1)}>
        Previous
      </Button>

      <span className="px-2 text-[13px] font-semibold text-text-secondary tabular-nums md:hidden">
        Page {current} of {count}
      </span>

      <ul className="hidden items-center gap-1.5 md:flex">
        {getPageItems(current, count, siblings).map((item) =>
          typeof item === "number" ? (
            <li key={item}>
              <Button
                iconOnly
                size="sm"
                variant={item === current ? "primary" : "secondary"}
                aria-label={`Page ${item}`}
                aria-current={item === current ? "page" : undefined}
                onClick={() => item !== current && onPageChange(item)}
                className="tabular-nums"
              >
                {item}
              </Button>
            </li>
          ) : (
            <li key={item} aria-hidden="true" className="w-6 text-center text-[13px] font-bold text-text-muted">
              …
            </li>
          ),
        )}
      </ul>

      <Button variant="secondary" size="sm" disabled={current >= count} onClick={() => onPageChange(current + 1)}>
        Next
      </Button>
    </nav>
  );
}
