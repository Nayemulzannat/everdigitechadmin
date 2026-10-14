"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Ellipsis } from "lucide-react";
import { cn } from "@/lib/cn";

const GAP = 6;
const MENU_WIDTH = 248;

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: "default" | "danger";
  /**
   * When set, the item is disabled and this sentence says why. It's printed under the label (so it works on touch,
   * where there is no hover) and set as the tooltip. The item stays focusable so keyboard users can read it.
   */
  disabledReason?: string;
}

export interface ActionMenuProps {
  /** Accessible name of the "…" button, e.g. "More actions for Jahid Hasan". */
  label: string;
  items: ActionMenuItem[];
  className?: string;
}

/**
 * "…" button with a menu of actions, on a native popover: it renders in the top layer so a scrolling table can't
 * clip it, and it closes on Esc, on a click outside, and after an item is chosen.
 */
export function ActionMenu({ label, items, className }: ActionMenuProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Open below the button, right-aligned with it, kept inside the viewport (above it when there's no room below).
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    function onBeforeToggle(event: Event) {
      if ((event as ToggleEvent).newState !== "open" || !menu || !triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const width = Math.min(MENU_WIDTH, window.innerWidth - GAP * 2);
      menu.style.width = `${width}px`;
      menu.style.left = `${Math.min(Math.max(GAP, rect.right - width), window.innerWidth - width - GAP)}px`;
      menu.style.right = "auto";
      const room = window.innerHeight - rect.bottom - GAP;
      if (room < items.length * 56 + 16 && rect.top > room) {
        menu.style.top = "auto";
        menu.style.bottom = `${window.innerHeight - rect.top + GAP}px`;
      } else {
        menu.style.top = `${rect.bottom + GAP}px`;
        menu.style.bottom = "auto";
      }
    }
    menu.addEventListener("beforetoggle", onBeforeToggle);
    return () => menu.removeEventListener("beforetoggle", onBeforeToggle);
  }, [items.length]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={id}
        aria-label={label}
        aria-haspopup="menu"
        className={cn(
          "inline-flex size-11 shrink-0 items-center justify-center rounded-nav border border-input-border bg-surface text-text-secondary transition-colors",
          "hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          className,
        )}
      >
        <Ellipsis aria-hidden="true" className="size-4" />
      </button>
      <div
        ref={menuRef}
        id={id}
        popover="auto"
        role="menu"
        aria-label={label}
        className="m-0 rounded-control border border-border bg-surface p-1.5 text-text shadow-lg"
      >
        {items.map((item) => {
          const disabled = Boolean(item.disabledReason);
          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              aria-disabled={disabled || undefined}
              title={item.disabledReason}
              onClick={() => {
                if (disabled) return;
                menuRef.current?.hidePopover();
                item.onSelect();
              }}
              className={cn(
                "flex min-h-11 w-full items-start gap-2.5 rounded-nav px-3 py-2.5 text-left text-sm font-semibold",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                disabled
                  ? "cursor-not-allowed text-text-subtle"
                  : item.tone === "danger"
                    ? "text-danger hover:bg-danger-soft"
                    : "text-text-secondary hover:bg-surface-muted hover:text-text",
              )}
            >
              <span aria-hidden="true" className="mt-0.5 flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
                {item.icon}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                {item.label}
                {item.disabledReason ? <span className="text-xs leading-snug font-normal text-text-muted">{item.disabledReason}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
