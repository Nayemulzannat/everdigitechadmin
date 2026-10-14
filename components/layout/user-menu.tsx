"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { CurrentUser } from "./user-card";

const GAP = 8;
const MENU_WIDTH = 256;

interface UserMenuProps {
  user: CurrentUser;
  /** "top-start": opens above the trigger (sidebar card). "bottom-end": opens below, right-aligned (top bar). */
  placement: "top-start" | "bottom-end";
  /** Classes for the trigger button. */
  className?: string;
  "aria-label"?: string;
  /** Trigger content. */
  children: ReactNode;
}

/**
 * Account menu (name, email, role, Sign out) on a native popover: it renders in the top layer, so the scrolling
 * sidebar can't clip it, and closes on Esc or a click outside.
 */
export function UserMenu({ user, placement, className, children, "aria-label": ariaLabel }: UserMenuProps) {
  const { logout } = useAuth();
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Position next to the trigger each time it opens (fixed coordinates, clamped to the viewport).
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    function onBeforeToggle(event: Event) {
      if ((event as ToggleEvent).newState !== "open" || !menu || !triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const width = Math.min(MENU_WIDTH, window.innerWidth - GAP * 2);
      const style = menu.style;
      style.width = `${width}px`;
      if (placement === "top-start") {
        style.top = "auto";
        style.bottom = `${window.innerHeight - rect.top + GAP}px`;
        style.left = `${Math.min(Math.max(GAP, rect.left), window.innerWidth - width - GAP)}px`;
        style.right = "auto";
      } else {
        style.top = `${rect.bottom + GAP}px`;
        style.bottom = "auto";
        style.left = "auto";
        style.right = `${Math.max(GAP, window.innerWidth - rect.right)}px`;
      }
    }
    menu.addEventListener("beforetoggle", onBeforeToggle);
    return () => menu.removeEventListener("beforetoggle", onBeforeToggle);
  }, [placement]);

  async function signOut() {
    setSigningOut(true);
    await logout();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={id}
        aria-label={ariaLabel}
        className={cn("rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary", className)}
      >
        {children}
      </button>
      <div
        ref={menuRef}
        id={id}
        popover="auto"
        role="dialog"
        aria-label="Account"
        className="m-0 rounded-control border border-border bg-surface p-1.5 text-text shadow-lg"
      >
        <div className="mb-1 flex min-w-0 flex-col gap-0.5 border-b border-divider px-3 pt-2 pb-2.5">
          <span className="truncate text-sm font-bold">{user.name}</span>
          <span className="truncate text-xs text-text-muted">{user.email}</span>
          <span className="mt-1 self-start rounded-pill bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">{user.role}</span>
        </div>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="flex min-h-11 w-full items-center gap-2.5 rounded-nav px-3 text-sm font-semibold text-danger hover:bg-danger-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          {signingOut ? <Spinner /> : <LogOut aria-hidden="true" className="size-4" />}
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </>
  );
}
