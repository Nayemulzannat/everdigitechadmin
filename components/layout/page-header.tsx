import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface PageHeaderProps {
  /** Small uppercase line above the title, e.g. the nav group. */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Controls on the right from md; on phones they sit under the title. */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow ? <span className="text-xs font-bold tracking-[0.14em] text-text-muted uppercase">{eyebrow}</span> : null}
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] md:text-[28px] xl:text-[30px]">{title}</h1>
        {description ? <p className="text-[15px] text-text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2.5 md:shrink-0">{actions}</div> : null}
    </div>
  );
}
