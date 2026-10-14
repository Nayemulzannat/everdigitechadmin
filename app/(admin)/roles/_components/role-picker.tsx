import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui";
import type { Role } from "@/lib/api/roles";
import { cn } from "@/lib/cn";

export const staffLabel = (count: number) => `${count} staff ${count === 1 ? "member" : "members"}`;

interface RolePickerProps {
  roles: Role[];
  selectedId: string;
  /** Live permission count for the selected role (includes unsaved edits). */
  selectedCount: number;
  onSelect: (id: string) => void;
}

/** lg+: a 300px column of role cards. */
export function RoleList({ roles, selectedId, selectedCount, onSelect }: RolePickerProps) {
  return (
    <ul aria-label="Roles" className="hidden flex-col gap-2 lg:flex">
      {roles.map((role) => {
        const selected = role.id === selectedId;
        const count = selected ? selectedCount : role.permissions.length;
        return (
          <li key={role.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(role.id)}
              className={cn(
                "flex w-full flex-col gap-1.5 rounded-[14px] border p-4 text-left transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                selected ? "border-primary bg-primary-hover-soft" : "border-border bg-surface hover:border-input-border",
              )}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-[15px] font-extrabold text-text">{role.name}</span>
                {role.locked ? <Lock aria-label="Locked role" className="size-4 shrink-0 text-text-muted" strokeWidth={2} /> : null}
              </span>
              <span className="text-[13px] leading-[1.45] text-text-muted">{role.description}</span>
              <span className="text-xs font-bold text-text-secondary">
                {staffLabel(role.staffCount)} · {count} permissions
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Below lg: a row of chips that scrolls sideways inside itself. */
export function RoleChips({ roles, selectedId, onSelect }: Omit<RolePickerProps, "selectedCount">) {
  return (
    <ul
      aria-label="Roles"
      className="-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-0.5 [scrollbar-width:none] md:-mx-6 md:px-6 lg:hidden [&::-webkit-scrollbar]:hidden"
    >
      {roles.map((role) => {
        const selected = role.id === selectedId;
        return (
          <li key={role.id} className="shrink-0">
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(role.id)}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-pill border px-4 text-sm font-bold whitespace-nowrap transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                selected ? "border-primary/30 bg-primary-soft text-primary" : "border-border bg-surface text-text-secondary hover:text-text",
              )}
            >
              {role.locked ? <Lock aria-hidden="true" className="size-3.5" strokeWidth={2.2} /> : null}
              {role.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function RolePickerSkeleton() {
  return (
    <>
      <div className="hidden flex-col gap-2 lg:flex">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-[14px] border border-border bg-surface p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
      <div className="flex gap-2 overflow-hidden lg:hidden">
        {[28, 20, 32, 30, 16].map((w, i) => (
          <Skeleton key={i} className="h-11 shrink-0 rounded-pill bg-border" style={{ width: `${w * 4}px` }} />
        ))}
      </div>
    </>
  );
}
