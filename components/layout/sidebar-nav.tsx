"use client";

import { useId, type FocusEvent, type PointerEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { useTicketAlerts } from "@/components/providers/ticket-alerts-provider";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { NAV_GROUPS, isNavItemActive } from "@/lib/navigation";

export interface SidebarNavProps {
  /**
   * Icon-rail mode. Only takes effect below xl (the rail exists at lg); from xl the full sidebar always shows,
   * so every rail style here is scoped with `max-xl:`.
   */
  collapsed?: boolean;
  /** Called when a link is chosen (the mobile drawer closes on it). */
  onNavigate?: () => void;
  /** Rail tooltips: an item was hovered/focused (`target` set) or left (`target` null). */
  onItemHint?: (label: string, target: HTMLElement | null) => void;
  className?: string;
}

export function SidebarNav({ collapsed = false, onNavigate, onItemHint, className }: SidebarNavProps) {
  const pathname = usePathname();
  const idPrefix = useId();
  const { can } = useAuth();
  const { waiting } = useTicketAlerts();

  // Only the pages this staff member may open; groups left empty disappear.
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || can(i.permission)) })).filter(
    (g) => g.items.length > 0,
  );

  const show = (label: string) => (event: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) =>
    onItemHint?.(label, event.currentTarget);
  const hide = (label: string) => () => onItemHint?.(label, null);

  return (
    <nav aria-label="Admin" className={cn("flex flex-col gap-[18px]", className)}>
      {groups.map((group, groupIndex) => {
        const labelId = `${idPrefix}-group-${groupIndex}`;
        return (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p
              id={labelId}
              className={cn(
                "px-3 pb-1.5 text-[11px] font-bold tracking-[0.12em] text-text-subtle uppercase",
                collapsed && "max-xl:sr-only",
              )}
            >
              {group.label}
            </p>
            {collapsed && groupIndex > 0 ? (
              <span aria-hidden="true" className="mx-2 mb-1.5 hidden h-px bg-divider max-xl:block" />
            ) : null}
            <ul aria-labelledby={labelId} className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isNavItemActive(item.href, pathname);
                const Icon = item.icon;
                // Support tickets shows the live count of tickets waiting for support; other items keep their static number.
                const badge = item.href === "/tickets" ? waiting : item.badge;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={onNavigate}
                      onPointerEnter={show(item.label)}
                      onPointerLeave={hide(item.label)}
                      onFocus={show(item.label)}
                      onBlur={hide(item.label)}
                      className={cn(
                        "relative flex min-h-11 items-center gap-3 rounded-nav px-3 text-sm font-semibold no-underline transition-colors",
                        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                        active
                          ? "bg-primary-soft text-primary hover:text-primary"
                          : "text-text-secondary hover:bg-primary-hover-soft hover:text-primary",
                        collapsed && "max-xl:justify-center max-xl:gap-0 max-xl:px-0",
                      )}
                    >
                      <Icon aria-hidden="true" strokeWidth={1.8} className="size-[18px] shrink-0" />
                      <span className={cn("min-w-0 truncate", collapsed && "max-xl:sr-only")}>{item.label}</span>
                      {badge ? (
                        <Badge
                          count={badge}
                          className={cn(
                            "ml-auto",
                            collapsed &&
                              "max-xl:absolute max-xl:top-0.5 max-xl:right-0.5 max-xl:ml-0 max-xl:min-w-0 max-xl:px-1.5 max-xl:py-0 max-xl:text-[10px]",
                          )}
                        />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
