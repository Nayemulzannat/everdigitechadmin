import type { ComponentProps, ReactNode } from "react";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export type AlertTone = "info" | "warning" | "danger";

const tones: Record<AlertTone, { box: string; Icon: typeof Info }> = {
  info: { box: "bg-info-soft text-info", Icon: Info },
  warning: { box: "border-warning/20 bg-warning-soft text-warning", Icon: TriangleAlert },
  danger: { box: "border-danger-border bg-danger-soft text-danger", Icon: CircleAlert },
};

export type AlertProps = Omit<ComponentProps<"div">, "title"> & {
  tone?: AlertTone;
  title?: ReactNode;
  /** Replaces the tone's default icon. */
  icon?: ReactNode;
};

/**
 * Inline message box (the design's notice callout). Pass role="alert" when it appears in response to an
 * action (e.g. a failed sign-in) so screen readers announce it.
 */
export function Alert({ tone = "info", title, icon, className, children, ...props }: AlertProps) {
  const { box, Icon } = tones[tone];
  return (
    <div
      className={cn("flex items-start gap-3 rounded-control border border-transparent px-4 py-3.5 text-sm leading-normal", box, className)}
      {...props}
    >
      <span className="mt-0.5 shrink-0 [&_svg]:size-[18px]">{icon ?? <Icon aria-hidden="true" strokeWidth={2} />}</span>
      <div className="flex min-w-0 flex-col gap-0.5">
        {title ? <p className="font-bold">{title}</p> : null}
        {children ? <div className={title ? "text-text-secondary" : undefined}>{children}</div> : null}
      </div>
    </div>
  );
}
