import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Field, controlClasses, useFieldIds, type FieldProps } from "./field";

export type ControlSize = "md" | "lg";

export type InputProps = Omit<ComponentProps<"input">, "size"> &
  FieldProps & {
    /** md is 44px (forms, filters); lg is 48px (sign-in). */
    controlSize?: ControlSize;
    /** Shown at the end of the label row, e.g. a "Forgot password?" link. */
    labelAction?: ReactNode;
    /** Inside the right edge of the input, e.g. a show/hide password Button (iconOnly, ghost). */
    trailing?: ReactNode;
    /** Classes for the <input> itself; `className` goes on the field wrapper. */
    inputClassName?: string;
  };

export function Input({
  label,
  hideLabel,
  hint,
  error,
  labelAction,
  trailing,
  controlSize = "md",
  id,
  className,
  inputClassName,
  "aria-describedby": describedBy,
  ...props
}: InputProps) {
  const ids = useFieldIds(id, { hint, error, describedBy });

  return (
    <Field label={label} hideLabel={hideLabel} hint={hint} error={error} labelAction={labelAction} className={className} {...ids}>
      <div className="relative">
        <input
          id={ids.controlId}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.ariaDescribedBy}
          className={cn(
            controlClasses(Boolean(error)),
            controlSize === "lg" ? "h-12 px-3.5 sm:text-[15px]" : "h-11 px-3",
            trailing && "pr-12",
            inputClassName,
          )}
          {...props}
        />
        {trailing ? <div className="absolute inset-y-0 right-0.5 flex items-center">{trailing}</div> : null}
      </div>
    </Field>
  );
}
