"use client";

import { useEffect, useImperativeHandle, useRef, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { FieldError, useFieldIds, type FieldProps } from "./field";

export type CheckboxProps = Omit<ComponentProps<"input">, "type" | "size"> &
  Omit<FieldProps, "hint"> & {
    /** Shows the mixed "–" state, e.g. a select-all box when only some rows are selected. */
    indeterminate?: boolean;
    /** Classes for the <input> itself; `className` goes on the wrapper. */
    inputClassName?: string;
  };

/** 18px checkbox inside a 44px tap area, with a real <label>. */
export function Checkbox({
  label,
  hideLabel,
  error,
  indeterminate = false,
  disabled,
  id,
  ref,
  className,
  inputClassName,
  "aria-describedby": describedBy,
  ...props
}: CheckboxProps) {
  const ids = useFieldIds(id, { error, describedBy });
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

  // `indeterminate` only exists as a DOM property, not an attribute.
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <div className={cn("inline-flex min-w-0 flex-col", className)}>
      <label
        htmlFor={ids.controlId}
        className={cn(
          "inline-flex min-h-11 items-center gap-2.5 text-sm text-text-secondary",
          hideLabel && "min-w-11 justify-center",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        )}
      >
        <input
          ref={inputRef}
          id={ids.controlId}
          type="checkbox"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.ariaDescribedBy}
          className={cn(
            "m-0 size-[18px] shrink-0 cursor-[inherit] accent-primary",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            inputClassName,
          )}
          {...props}
        />
        <span className={hideLabel ? "sr-only" : "min-w-0"}>{label}</span>
      </label>
      {error ? <FieldError id={ids.errorId}>{error}</FieldError> : null}
    </div>
  );
}
