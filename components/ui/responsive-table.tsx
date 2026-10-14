import type { Key, ReactNode, Ref } from "react";
import { cn } from "@/lib/cn";
import { EmptyState } from "./empty-state";

export interface TableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  align?: "left" | "right" | "center";
  /** Keep the header for screen readers only (e.g. an "Actions" column). */
  srOnlyHeader?: boolean;
  headerClassName?: string;
  cellClassName?: string;
}

export interface ResponsiveTableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => Key;
  /** What each row looks like as a stacked card below md. */
  renderMobileRow: (row: T, index: number) => ReactNode;
  /** Describes the table for screen readers. */
  caption?: string;
  /** Shown instead of the table when there are no rows. */
  empty?: ReactNode;
  /** Minimum table width in px from md up; the table scrolls sideways inside its wrapper below it. */
  minWidth?: number;
  /** 12px instead of 16px between columns (outer edges stay 20px), for wide tables in narrow cards. */
  compact?: boolean;
  /** Bar under the rows, typically a count and <Pagination>. */
  footer?: ReactNode;
  id?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;

/**
 * List-page table. From md up it's a real <table> inside its own overflow-x-auto wrapper,
 * below md each row renders as a stacked card via `renderMobileRow`.
 */
export function ResponsiveTable<T>({
  columns,
  rows,
  getRowKey,
  renderMobileRow,
  caption,
  empty,
  minWidth,
  compact = false,
  footer,
  id,
  className,
  ref,
}: ResponsiveTableProps<T>) {
  return (
    <div ref={ref} id={id} className={cn("flex min-w-0 flex-col", className)}>
      {rows.length === 0 ? (
        (empty ?? <EmptyState title="Nothing to show" text="There are no records here yet." />)
      ) : (
        <>
          {/* relative: keeps absolutely positioned children (e.g. sr-only headers) inside the scroller, not widening the page */}
          <div className="relative hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-sm" style={minWidth ? { minWidth } : undefined}>
              {caption ? <caption className="sr-only">{caption}</caption> : null}
              <thead>
                <tr className="bg-surface-muted">
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      scope="col"
                      className={cn(
                        "py-3 text-xs font-bold tracking-[0.06em] whitespace-nowrap text-text-muted uppercase first:pl-5 last:pr-5",
                        compact ? "px-3" : "px-4",
                        alignClass[column.align ?? "left"],
                        column.headerClassName,
                      )}
                    >
                      {column.srOnlyHeader ? <span className="sr-only">{column.header}</span> : column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={getRowKey(row, index)} className="border-t border-divider transition-colors hover:bg-surface-muted">
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={cn(
                          "py-3.5 align-middle first:pl-5 last:pr-5",
                          compact ? "px-3" : "px-4",
                          alignClass[column.align ?? "left"],
                          column.cellClassName,
                        )}
                      >
                        {column.cell(row, index)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul aria-label={caption} className="flex flex-col gap-3 p-3 sm:p-4 md:hidden">
            {rows.map((row, index) => (
              <li key={getRowKey(row, index)} className="min-w-0 rounded-control border border-border bg-surface p-4">
                {renderMobileRow(row, index)}
              </li>
            ))}
          </ul>
        </>
      )}

      {footer ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3.5 md:px-5">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
