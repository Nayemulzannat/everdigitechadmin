import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { Field, controlClasses, useFieldIds, type FieldProps } from "./field";

export type SelectProps = Omit<ComponentProps<"select">, "size"> &
  FieldProps & {
    /** Classes for the <select> itself; `className` goes on the field wrapper. */
    selectClassName?: string;
  };

/** Native <select> (best on phones) with the design's border, radius and a consistent chevron. */
export function Select({
  label,
  hideLabel,
  hint,
  error,
  id,
  className,
  selectClassName,
  children,
  "aria-describedby": describedBy,
  ...props
}: SelectProps) {
  const ids = useFieldIds(id, { hint, error, describedBy });

  return (
    <Field label={label} hideLabel={hideLabel} hint={hint} error={error} className={className} {...ids}>
      <div className="relative">
        <select
          id={ids.controlId}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.ariaDescribedBy}
          className={cn(
            controlClasses(Boolean(error)),
            "h-11 cursor-pointer appearance-none truncate pr-10 pl-3 text-text-secondary",
            selectClassName,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-muted"
        />
      </div>
    </Field>
  );
}
