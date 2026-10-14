import type { ComponentProps } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { Field, controlClasses, useFieldIds, type FieldProps } from "./field";

export type SearchInputProps = Omit<ComponentProps<"input">, "size" | "type"> &
  Partial<Pick<FieldProps, "label">> &
  Omit<FieldProps, "label"> & {
    /** default: white with input border (toolbars). muted: grey fill with light border (top bar). */
    variant?: "default" | "muted";
    /** Keyboard hint shown at the end from sm up, e.g. "Ctrl K". */
    shortcut?: string;
    /** Classes for the <input> itself; `className` goes on the field wrapper. */
    inputClassName?: string;
  };

/** Search field with a leading icon. The label defaults to "Search" and is visually hidden. */
export function SearchInput({
  label = "Search",
  hideLabel = true,
  hint,
  error,
  variant = "default",
  shortcut,
  id,
  className,
  inputClassName,
  "aria-describedby": describedBy,
  ...props
}: SearchInputProps) {
  const ids = useFieldIds(id, { hint, error, describedBy });
  const muted = variant === "muted";

  return (
    <Field label={label} hideLabel={hideLabel} hint={hint} error={error} className={className} {...ids}>
      <div className="relative">
        <Search
          aria-hidden="true"
          strokeWidth={1.8}
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-text-muted",
            muted ? "left-3.5 size-[18px]" : "left-3 size-4",
          )}
        />
        <input
          id={ids.controlId}
          type="search"
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.ariaDescribedBy}
          aria-keyshortcuts={shortcut ? shortcut.replace(/\s+/g, "+") : undefined}
          className={cn(
            controlClasses(Boolean(error)),
            "h-11 pr-3",
            muted ? "pl-10.5" : "pl-9",
            muted && !error && "border-border bg-surface-muted focus:bg-surface",
            shortcut && "sm:pr-18",
            inputClassName,
          )}
          {...props}
        />
        {shortcut ? (
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-border bg-surface px-1.5 py-0.5 font-sans text-xs font-bold text-text-muted sm:inline-block"
          >
            {shortcut}
          </kbd>
        ) : null}
      </div>
    </Field>
  );
}
