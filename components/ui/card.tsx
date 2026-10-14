import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * md: 16px phone → 20px from md (stat cards).
 * lg: 16px phone → 24px from md (content sections).
 * none: no body padding and a bordered header, for cards that hold a table or list edge to edge.
 */
export type CardPadding = "md" | "lg" | "none";

export type CardProps = Omit<ComponentProps<"section">, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  /** Shown at the end of the header, usually a <CardLink>. */
  action?: ReactNode;
  titleAs?: "h2" | "h3";
  padding?: CardPadding;
};

const bodyPadding: Record<CardPadding, string> = {
  md: "gap-4 p-4 md:gap-5 md:p-5",
  lg: "gap-4 p-4 md:gap-5 md:p-6",
  none: "",
};

export function Card({
  title,
  description,
  action,
  titleAs: Title = "h2",
  padding = "lg",
  className,
  children,
  ...props
}: CardProps) {
  const titleId = useId();
  const hasHeader = Boolean(title || action);
  const flush = padding === "none";

  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={cn(
        "flex min-w-0 flex-col rounded-card border border-border bg-surface",
        flush && "overflow-hidden",
        bodyPadding[padding],
        className,
      )}
      {...props}
    >
      {hasHeader ? (
        <div
          className={cn(
            "flex items-start justify-between gap-3",
            flush && "border-b border-border px-4 py-4 md:px-6 md:py-5",
          )}
        >
          <div className="flex min-w-0 flex-col gap-1">
            {title ? (
              <Title id={titleId} className="text-[17px] font-extrabold">
                {title}
              </Title>
            ) : null}
            {description ? <p className="text-[13px] text-text-muted">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** The small bold header link ("Open report", "All orders"). Keeps a 44px tap height without growing the header. */
export function CardLink({ className, ...props }: ComponentProps<"a">) {
  return (
    <a
      className={cn(
        "-my-3 inline-flex min-h-11 items-center text-[13px] font-bold whitespace-nowrap no-underline",
        "focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-primary",
        className,
      )}
      {...props}
    />
  );
}
