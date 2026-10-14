"use client";

import { useState } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { AdminPill, UserCard, type CurrentUser } from "./user-card";
import { UserMenu } from "./user-menu";
import { useSidebarExpanded } from "./use-sidebar-expanded";

const SIDEBAR_ID = "admin-sidebar";

interface Tooltip {
  label: string;
  top: number;
  left: number;
}

/**
 * Desktop sidebar (hidden below lg; the mobile drawer takes over there).
 * - xl+: full 256px sidebar.
 * - lg: 72px icon rail by default; the toggle expands it to 256px over the content. The choice is remembered.
 * Every rail style is `max-xl:` so xl always gets the full sidebar whatever the stored choice.
 */
export function Sidebar({ user }: { user: CurrentUser }) {
  const [expanded, setExpanded] = useSidebarExpanded();
  const collapsed = !expanded;
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  // Tooltips use fixed positioning: the rail scrolls, which would clip an absolutely positioned tooltip.
  function onItemHint(label: string, target: HTMLElement | null) {
    const railVisible = collapsed && window.matchMedia("(min-width: 1024px) and (max-width: 1279.98px)").matches;
    if (!target || !railVisible) {
      setTooltip((current) => (current?.label === label || !target ? null : current));
      return;
    }
    const rect = target.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2, left: rect.right + 10 });
  }

  return (
    // Reserves the layout width (72px rail at lg, 256px at xl). The panel inside can grow past it as an overlay.
    <div className="relative hidden w-18 shrink-0 lg:block xl:w-64">
      <aside
        id={SIDEBAR_ID}
        aria-label="Sidebar"
        onScroll={() => setTooltip(null)}
        className={cn(
          "sticky top-0 z-30 flex h-dvh w-64 flex-col gap-[22px] overflow-y-auto overscroll-contain border-r border-border bg-surface px-3.5 py-5",
          "[scrollbar-width:thin] motion-safe:transition-[width,box-shadow] motion-safe:duration-200",
          collapsed ? "max-xl:w-18 max-xl:px-3 max-xl:[scrollbar-width:none] max-xl:[&::-webkit-scrollbar]:hidden" : "max-xl:shadow-xl",
        )}
      >
        <div className={cn("flex flex-col gap-1.5 border-b border-divider px-2 pt-1 pb-3", collapsed && "max-xl:items-center max-xl:px-0")}>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 min-w-11 items-center justify-center self-start rounded-nav no-underline focus-visible:outline-2 focus-visible:outline-primary max-xl:self-auto"
          >
            <Logo className={cn(collapsed && "max-xl:hidden")} />
            <Logo markOnly className={collapsed ? "hidden max-xl:inline-flex" : "hidden"} />
          </Link>
          <AdminPill className={cn(collapsed && "max-xl:hidden")} />
        </div>

        <SidebarNav collapsed={collapsed} onItemHint={onItemHint} className="grow" />

        <div className="flex flex-col gap-3">
          <Button
            iconOnly
            variant="ghost"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            aria-controls={SIDEBAR_ID}
            onClick={() => {
              setTooltip(null);
              setExpanded(collapsed);
            }}
            className={cn("hidden self-end lg:inline-flex xl:hidden", collapsed && "self-center")}
          >
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </Button>
          <UserMenu user={user} placement="top-start" aria-label={`Account: ${user.name}`} className="flex w-full flex-col">
            <UserCard user={user} collapsed={collapsed} className="transition-colors hover:border-input-border" />
          </UserMenu>
        </div>
      </aside>

      {tooltip ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-40 -translate-y-1/2 rounded-lg bg-text px-2.5 py-1.5 text-xs font-bold whitespace-nowrap text-on-primary shadow-lg xl:hidden"
          style={{ top: tooltip.top, left: tooltip.left }}
        >
          {tooltip.label}
        </div>
      ) : null}
    </div>
  );
}
