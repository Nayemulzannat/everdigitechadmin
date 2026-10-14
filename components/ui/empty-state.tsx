import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type EmptyStateProps = Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  text?: ReactNode;
  /** Optional icon above the title. */
  icon?: ReactNode;
  /** Optional call to action, e.g. a "Clear filters" Button. */
  action?: ReactNode;
};

export function EmptyState({ title, text, icon, action, className, ...props }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1.5 px-5 py-12 text-center", className)} {...props}>
      {icon ? (
        <span className="mb-2 flex size-11 items-center justify-center rounded-control bg-neutral-soft text-text-muted [&_svg]:size-5">
          {icon}
        </span>
      ) : null}
      <p className="text-[15px] font-bold">{title}</p>
      {text ? <p className="max-w-sm text-[13px] text-text-muted">{text}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
