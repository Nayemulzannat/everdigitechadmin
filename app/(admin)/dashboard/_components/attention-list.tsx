import Link from "next/link";
import { CircleX, FileWarning, Globe, Server, ShoppingBag, type LucideIcon } from "lucide-react";
import { Card, Skeleton } from "@/components/ui";
import type { AttentionItem, AttentionKind } from "@/lib/api/dashboard";
import { cn } from "@/lib/cn";

const ICONS: Record<AttentionKind, LucideIcon> = {
  orders: ShoppingBag,
  invoices: FileWarning,
  domains: Globe,
  provisioning: CircleX,
  server: Server,
};

const SEVERITY: Record<AttentionItem["severity"], string> = {
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-primary",
};

export function AttentionList({ items }: { items: AttentionItem[] }) {
  return (
    <Card title="Needs attention" className="gap-2 md:gap-3">
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">Nothing needs your attention right now.</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => {
            const Icon = ICONS[item.kind];
            return (
              <li key={item.id} className="border-b border-divider last:border-b-0">
                <Link
                  href={item.href}
                  className="group flex min-h-11 items-center gap-3 rounded-nav py-3 text-text no-underline hover:text-text focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center rounded-nav", SEVERITY[item.severity])}>
                    <Icon className="size-4" strokeWidth={2} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-bold">{item.title}</span>
                    <span className="text-xs text-text-muted">{item.detail}</span>
                  </span>
                  <span className="shrink-0 text-[13px] font-bold text-primary group-hover:text-primary-hover">{item.actionLabel}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function AttentionListSkeleton() {
  return (
    <Card className="gap-2 md:gap-3">
      <Skeleton className="h-5 w-36" />
      <div className="flex flex-col">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-divider py-3 last:border-b-0">
            <Skeleton className="size-9 shrink-0 rounded-nav" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </div>
    </Card>
  );
}
