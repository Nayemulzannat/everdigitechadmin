import { Avatar } from "@/components/ui";
import { cn } from "@/lib/cn";

export interface CurrentUser {
  name: string;
  email: string;
  /** Role name, e.g. "Super Admin". */
  role: string;
}

/**
 * Signed-in staff member (avatar, name, role). Built from spans so it can sit inside a button.
 * `collapsed` shows only the avatar in the lg icon rail.
 */
export function UserCard({ user, collapsed = false, className }: { user: CurrentUser; collapsed?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "flex min-w-0 shrink-0 items-center gap-2.5 rounded-control border border-user-card-border bg-primary-hover-soft p-3 text-left",
        collapsed && "max-xl:justify-center max-xl:p-1",
        className,
      )}
    >
      <Avatar name={user.name} size={36} />
      <span className={cn("flex min-w-0 flex-col", collapsed && "max-xl:sr-only")}>
        <span className="truncate text-[13px] font-bold text-text">{user.name}</span>
        <span className="truncate text-xs text-text-muted">{user.role}</span>
      </span>
    </span>
  );
}

/** The "ADMIN CONSOLE" pill under the logo. */
export function AdminPill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex self-start rounded-pill bg-primary-soft px-2.5 py-1 text-[11px] font-bold tracking-[0.12em] text-primary uppercase",
        className,
      )}
    >
      Admin console
    </span>
  );
}
