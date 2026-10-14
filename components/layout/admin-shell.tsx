"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { TicketAlertsProvider } from "@/components/providers/ticket-alerts-provider";
import { Alert, Button, Drawer, SearchInput, Sheet, Spinner } from "@/components/ui";
import { Logo } from "./logo";
import { Sidebar } from "./sidebar";
import { SidebarNav } from "./sidebar-nav";
import { SEARCH_PLACEHOLDER, Topbar } from "./topbar";
import { AdminPill, UserCard, type CurrentUser } from "./user-card";

const LG_QUERY = "(min-width: 1024px)";

/** Signed-in layout: sidebar (xl full, lg rail, drawer below lg), sticky top bar and the main content column. */
export function AdminShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  // Until GET /me answers (or while redirecting to /login) there's no one to show the shell for.
  if (!auth.user || !auth.role) return <ShellPlaceholder error={auth.error} onRetry={auth.retry} />;
  return (
    <TicketAlertsProvider enabled={auth.can("tickets.view")}>
      <SignedInShell user={{ name: auth.user.name, email: auth.user.email, role: auth.role.name }} onSignOut={auth.logout}>
        {children}
      </SignedInShell>
    </TicketAlertsProvider>
  );
}

/** Full-screen loading state, or a retry message when the API can't be reached. */
function ShellPlaceholder({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      {error ? (
        <Alert tone="danger" role="alert" title="The admin console couldn't load" className="w-full max-w-md bg-surface">
          <div className="flex flex-col items-start gap-3">
            <span>{error.message}</span>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </div>
        </Alert>
      ) : (
        <div role="status" className="flex flex-col items-center gap-3 text-sm text-text-muted">
          <Spinner className="size-6 text-primary" />
          Loading the admin console…
        </div>
      )}
    </div>
  );
}

function SignedInShell({ user, onSignOut, children }: { user: CurrentUser; onSignOut: () => Promise<void>; children: ReactNode }) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  // Overlays remember the path they were opened on, so any route change (links, back/forward) closes them.
  const [menuOpenedAt, setMenuOpenedAt] = useState<string | null>(null);
  const [searchOpenedAt, setSearchOpenedAt] = useState<string | null>(null);
  const menuOpen = menuOpenedAt === pathname;
  const searchOpen = searchOpenedAt === pathname;

  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const sheetSearchRef = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd + K focuses search at every width: the top-bar input from lg, the search sheet below.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      event.preventDefault();
      if (window.matchMedia(LG_QUERY).matches) {
        desktopSearchRef.current?.focus();
        desktopSearchRef.current?.select();
      } else {
        setMenuOpenedAt(null);
        setSearchOpenedAt(window.location.pathname);
        sheetSearchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-surface px-4 py-3 font-bold focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-2 focus:outline-primary"
      >
        Skip to content
      </a>

      <Sidebar user={user} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          onOpenMenu={() => setMenuOpenedAt(pathname)}
          onOpenSearch={() => setSearchOpenedAt(pathname)}
          searchInputRef={desktopSearchRef}
        />
        <main id="main" tabIndex={-1} className="w-full max-w-[1360px] min-w-0 flex-1 px-4 py-4 outline-none md:px-6 md:py-6 xl:px-8 xl:py-8">
          {children}
        </main>
      </div>

      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpenedAt(null)}
        title={<Logo />}
        description={<AdminPill className="mt-1.5" />}
        closeLabel="Close menu"
      >
        <div className="flex min-h-full flex-col gap-5">
          <SidebarNav onNavigate={() => setMenuOpenedAt(null)} className="-mx-1" />
          <div className="mt-auto flex flex-col gap-2">
            <UserCard user={user} />
            <Button
              variant="ghost"
              loading={signingOut}
              leadingIcon={<LogOut aria-hidden="true" className="size-4" />}
              onClick={() => {
                setSigningOut(true);
                void onSignOut();
              }}
              className="justify-start text-danger hover:bg-danger-soft hover:text-danger"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </div>
      </Drawer>

      <Sheet
        side="top"
        open={searchOpen}
        onClose={() => setSearchOpenedAt(null)}
        title="Search"
        closeLabel="Close search"
        initialFocusRef={sheetSearchRef}
      >
        <form role="search" onSubmit={(event) => event.preventDefault()}>
          <SearchInput ref={sheetSearchRef} label="Search the admin console" placeholder={SEARCH_PLACEHOLDER} enterKeyHint="search" />
        </form>
      </Sheet>
    </div>
  );
}
