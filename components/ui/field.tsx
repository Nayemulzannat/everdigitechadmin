import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Props every labelled form control shares. */
export interface FieldProps {
  /** Visible label text. Always rendered as a real <label>, even when hidden. */
  label: ReactNode;
  /** Keep the label for screen readers but hide it visually. */
  hideLabel?: boolean;
  /** Helper text under the control. */
  hint?: ReactNode;
  /** Error message. Also marks the control aria-invalid. */
  error?: ReactNode;
}

/** Ids for a control and its hint/error text, plus the matching aria-describedby value. */
export function useFieldIds(id: string | undefined, { hint, error, describedBy }: { hint?: ReactNode; error?: ReactNode; describedBy?: string }) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const ariaDescribedBy = [describedBy, hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return { controlId, hintId, errorId, ariaDescribedBy };
}

export function FieldHint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-[13px] text-text-muted">
      {children}
    </p>
  );
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-[13px] font-semibold text-danger">
      {children}
    </p>
  );
}

interface FieldLayoutProps extends FieldProps {
  controlId: string;
  hintId: string;
  errorId: string;
  /** Shown at the end of the label row, e.g. a "Forgot password?" link. */
  labelAction?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Label + control + hint + error stack used by Input, Select and SearchInput. */
export function Field({ label, hideLabel, hint, error, controlId, hintId, errorId, labelAction, className, children }: FieldLayoutProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {hideLabel && !labelAction ? (
        <label htmlFor={controlId} className="sr-only">
          {label}
        </label>
      ) : (
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={controlId} className={cn("text-[13px] font-bold text-text-secondary", hideLabel && "sr-only")}>
            {label}
          </label>
          {labelAction}
        </div>
      )}
      {children}
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

/**
 * Shared control look: 16px text on phones so iOS doesn't zoom, 14px from sm.
 * Pass `invalid` to switch to the danger border.
 */
export function controlClasses(invalid: boolean) {
  return cn(
    "w-full min-w-0 rounded-control border bg-surface text-base text-text sm:text-sm",
    "placeholder:text-text-subtle outline-none transition-[border-color,box-shadow]",
    "focus:ring-3 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-subtle",
    invalid
      ? "border-danger focus:border-danger focus:ring-danger/15"
      : "border-input-border focus:border-primary focus:ring-primary/15",
  );
}
