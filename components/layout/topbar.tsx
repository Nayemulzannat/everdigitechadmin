"use client";

import { useSyncExternalStore, type RefObject } from "react";
import Link from "next/link";
import { Bell, Menu, Plus, Search } from "lucide-react";
import { Can } from "@/components/auth/can";
import { Avatar, Button, SearchInput } from "@/components/ui";
import type { PermissionKey } from "@/types/permissions";
import { Logo } from "./logo";
import type { CurrentUser } from "./user-card";
import { UserMenu } from "./user-menu";

/** Quick create shows when the user can create at least one of these. */
const CREATE_PERMISSIONS: PermissionKey[] = ["clients.create", "orders.create", "invoices.create", "tickets.create"];

const subscribeNever = () => () => {};
const isApple = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

/** "⌘ K" on Apple devices, "Ctrl K" elsewhere (and during the server render). */
function useSearchShortcutLabel() {
  return useSyncExternalStore(
    subscribeNever,
    () => (isApple() ? "⌘ K" : "Ctrl K"),
    () => "Ctrl K",
  );
}

export const SEARCH_PLACEHOLDER = "Search clients, domains, invoices…";

export interface TopbarProps {
  user: CurrentUser;
  onOpenMenu: () => void;
  onOpenSearch: () => void;
  /** The lg+ search input, focused by Ctrl/Cmd + K. */
  searchInputRef: RefObject<HTMLInputElement | null>;
}

/**
 * Below lg: menu · logo · search, create, notifications, avatar (60px tall).
 * lg+: full search with shortcut hint · Quick create · notifications (72px tall).
 */
export function Topbar({ user, onOpenMenu, onOpenSearch, searchInputRef }: TopbarProps) {
  const shortcut = useSearchShortcutLabel();

  return (
    <header className="sticky top-0 z-20 flex h-15 shrink-0 items-center gap-2 border-b border-border bg-surface px-4 md:px-6 lg:h-18 lg:gap-4 xl:px-8">
      <Button iconOnly variant="ghost" aria-label="Open menu" aria-haspopup="dialog" onClick={onOpenMenu} className="-ml-2 lg:hidden">
        <Menu aria-hidden="true" className="size-5" />
      </Button>
      <Link
        href="/dashboard"
        className="inline-flex min-h-11 min-w-11 items-center rounded-nav no-underline focus-visible:outline-2 focus-visible:outline-primary lg:hidden"
      >
        <Logo size="sm" compact />
      </Link>

      <form role="search" onSubmit={(event) => event.preventDefault()} className="hidden w-full max-w-[440px] lg:block">
        <SearchInput
          ref={searchInputRef}
          id="admin-search"
          variant="muted"
          shortcut={shortcut}
          placeholder={SEARCH_PLACEHOLDER}
        />
      </form>

      <div className="ml-auto flex items-center gap-1 lg:gap-4">
        <Button iconOnly variant="ghost" aria-label="Search" aria-haspopup="dialog" onClick={onOpenSearch} className="lg:hidden">
          <Search aria-hidden="true" className="size-5" strokeWidth={1.8} />
        </Button>
        <Can permission={CREATE_PERMISSIONS}>
          <Button iconOnly aria-label="Quick create" className="lg:hidden">
            <Plus aria-hidden="true" className="size-5" strokeWidth={2.2} />
          </Button>
          <Button leadingIcon={<Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />} className="hidden lg:inline-flex">
            Quick create
          </Button>
        </Can>
        <Button
          iconOnly
          variant="secondary"
          aria-label="Notifications (unread)"
          className="max-lg:border-transparent max-lg:bg-transparent lg:border-border"
        >
          <Bell aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
          <span aria-hidden="true" className="absolute top-2.5 right-[11px] size-2 rounded-pill border-2 border-surface bg-alert-dot" />
        </Button>
        {/* lg+ uses the account menu on the sidebar's user card. */}
        <UserMenu
          user={user}
          placement="bottom-end"
          aria-label={`Account: ${user.name}`}
          className="flex size-11 items-center justify-center rounded-pill lg:hidden"
        >
          <Avatar name={user.name} size={36} />
        </UserMenu>
      </div>
    </header>
  );
}
