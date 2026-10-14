"use client";

import { useId, type ReactNode } from "react";
import { Ban, Mail, ShieldAlert, ShieldCheck, Trash2, UserCheck } from "lucide-react";
import { ActionMenu, Avatar, Button, Skeleton, StatusPill, type ActionMenuItem, type StatusTone, type TableColumn } from "@/components/ui";
import { STAFF_STATUS_LABELS, type StaffMember, type StaffStats, type StaffStatus } from "@/lib/api/staff";
import { cn } from "@/lib/cn";
import { formatAgo, formatRecentDateTime } from "@/lib/format";
import { staffActions, type StaffActions, type StaffRule, type StaffViewer } from "@/lib/staff-rules";

const STATUS_TONE: Record<StaffStatus, StatusTone> = { active: "success", invited: "info", suspended: "danger" };

/** Everything a row needs to decide what it may do, and what to call when an action is chosen. */
export interface StaffRowContext {
  viewer: StaffViewer;
  stats: Pick<StaffStats, "activeSuperAdmins">;
  /** "Now" for relative dates, taken from when the data was fetched. */
  now: string;
  /** Whether the signed-in person holds a permission (staff.edit, staff.delete, staff.create). */
  can: (permission: "staff.create" | "staff.edit" | "staff.delete") => boolean;
  /** Id of the person whose invite or reactivation is being sent right now. */
  busyId: string | null;
  onEdit: (member: StaffMember) => void;
  onSuspend: (member: StaffMember) => void;
  onReactivate: (member: StaffMember) => void;
  onRemove: (member: StaffMember) => void;
  onResendInvite: (member: StaffMember) => void;
}

function StaffStatusPill({ status }: { status: StaffStatus }) {
  return (
    <StatusPill tone={STATUS_TONE[status]} className={status === "invited" ? "text-primary" : undefined}>
      {STAFF_STATUS_LABELS[status]}
    </StatusPill>
  );
}

/** Super Admin in primary-soft, every other role neutral. */
function RolePill({ member }: { member: StaffMember }) {
  if (!member.role) return <span className="text-text-muted">—</span>;
  return (
    <span
      className={cn(
        "rounded-lg px-2.5 py-1 text-xs font-bold whitespace-nowrap",
        member.role.isSuperAdmin ? "bg-primary-soft text-primary" : "bg-neutral-soft text-text-secondary",
      )}
    >
      {member.role.name}
    </span>
  );
}

/** On / Off, or "Not set up yet" for someone who hasn't accepted their invite. */
function TwoFactor({ member }: { member: StaffMember }) {
  if (member.status === "invited") return <span className="text-[13px] text-text-muted">Not set up yet</span>;
  return member.twoFactorEnabled ? (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-success">
      <ShieldCheck aria-hidden="true" className="size-4" strokeWidth={2} />
      On
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-warning">
      <ShieldAlert aria-hidden="true" className="size-4" strokeWidth={2} />
      Off
    </span>
  );
}

function YouTag() {
  return <span className="rounded-pill bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">You</span>;
}

/** The two lines under "Last sign-in": when, and where from (or why there is nothing). */
function lastSignIn(member: StaffMember, ctx: StaffRowContext): { primary: string; secondary: string | null } {
  if (member.status === "invited") {
    return { primary: "Never signed in", secondary: member.invitedAt ? `Invite sent ${formatAgo(member.invitedAt, ctx.now)}` : null };
  }
  if (member.id === ctx.viewer.id) return { primary: "Active now", secondary: member.lastLoginDevice };
  const primary = member.lastLoginAt ? formatRecentDateTime(member.lastLoginAt, ctx.now) : "Never signed in";
  if (member.status === "suspended" && member.suspendedBy) return { primary, secondary: `Suspended by ${member.suspendedBy}` };
  // No city: the API has no location lookup, so the IP stands in for it.
  return { primary, secondary: [member.lastLoginIp, member.lastLoginDevice].filter(Boolean).join(" · ") || null };
}

function LastSignIn({ member, ctx }: { member: StaffMember; ctx: StaffRowContext }) {
  const { primary, secondary } = lastSignIn(member, ctx);
  return (
    <div className="min-w-0">
      <div className="font-semibold whitespace-nowrap">{primary}</div>
      {secondary ? <div className="max-w-[210px] truncate text-xs text-text-muted" title={secondary}>{secondary}</div> : null}
    </div>
  );
}

/**
 * A button that can be switched off with a reason. It stays focusable (aria-disabled, not `disabled`) so the
 * tooltip shows on hover and keyboard focus, and the reason is also read out to screen readers.
 */
function RuleButton({
  rule,
  loading,
  onClick,
  className,
  children,
}: {
  rule: StaffRule;
  loading?: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  const reasonId = useId();
  const blocked = !rule.allowed;
  return (
    <>
      <Button
        variant="secondary"
        loading={loading}
        aria-disabled={blocked || undefined}
        aria-describedby={blocked ? reasonId : undefined}
        title={blocked ? rule.reason : undefined}
        onClick={() => {
          if (!blocked) onClick();
        }}
        className={cn("rounded-nav text-[13px]", blocked && "cursor-not-allowed opacity-45 hover:bg-surface hover:text-text-secondary", className)}
      >
        {children}
      </Button>
      {blocked ? (
        <span id={reasonId} className="sr-only">
          {rule.reason}
        </span>
      ) : null}
    </>
  );
}

const reason = (rule: StaffRule) => (rule.allowed ? undefined : rule.reason);

/** The "More" menu: Suspend / Reactivate / Remove, each only if the signed-in person may. */
function menuItems(member: StaffMember, actions: StaffActions, ctx: StaffRowContext): ActionMenuItem[] {
  const items: ActionMenuItem[] = [];
  if (ctx.can("staff.edit")) {
    items.push(
      member.status === "suspended"
        ? { id: "reactivate", label: "Reactivate", icon: <UserCheck />, onSelect: () => ctx.onReactivate(member), disabledReason: reason(actions.reactivate) }
        : { id: "suspend", label: "Suspend", icon: <Ban />, onSelect: () => ctx.onSuspend(member), disabledReason: reason(actions.suspend) },
    );
  }
  if (ctx.can("staff.delete")) {
    items.push({ id: "remove", label: "Remove", icon: <Trash2 />, tone: "danger", onSelect: () => ctx.onRemove(member), disabledReason: reason(actions.remove) });
  }
  return items;
}

/** Resend invite (invited) or Edit, plus the More menu. `stretch` makes the main button fill the row on phone cards. */
function StaffRowActions({ member, ctx, stretch = false }: { member: StaffMember; ctx: StaffRowContext; stretch?: boolean }) {
  const actions = staffActions(member, ctx.viewer, ctx.stats);
  const items = menuItems(member, actions, ctx);
  const invited = member.status === "invited";

  const main = invited ? (
    ctx.can("staff.create") ? (
      <RuleButton
        rule={actions.resendInvite}
        loading={ctx.busyId === member.id}
        onClick={() => ctx.onResendInvite(member)}
        className={cn("h-11", stretch ? "flex-1" : "px-3.5")}
      >
        <Mail aria-hidden="true" className="size-4" />
        Resend invite
      </RuleButton>
    ) : null
  ) : ctx.can("staff.edit") ? (
    <RuleButton rule={actions.edit} onClick={() => ctx.onEdit(member)} className={cn("h-11", stretch ? "flex-1" : "px-3.5")}>
      Edit
    </RuleButton>
  ) : null;

  if (!main && items.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-1.5", stretch ? "gap-2" : "justify-end")}>
      {main}
      {items.length > 0 ? <ActionMenu label={`More actions for ${member.name}`} items={items} className="rounded-nav" /> : null}
    </div>
  );
}

function Identity({ member, ctx }: { member: StaffMember; ctx: StaffRowContext }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={member.name} className="bg-primary-soft text-brand-dark" />
      <div className="flex min-w-0 flex-col">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-bold">{member.name}</span>
          {member.id === ctx.viewer.id ? <YouTag /> : null}
        </span>
        <span title={member.email} className="max-w-[210px] truncate text-xs text-text-muted">
          {member.email}
        </span>
      </div>
    </div>
  );
}

/** Table columns for md and up. They depend on the viewer and the callbacks, so they are built from a context. */
export function staffColumns(ctx: StaffRowContext): TableColumn<StaffMember>[] {
  return [
    { id: "member", header: "Staff member", headerClassName: "min-w-[240px]", cell: (m) => <Identity member={m} ctx={ctx} /> },
    { id: "role", header: "Role", cell: (m) => <RolePill member={m} /> },
    { id: "status", header: "Status", cellClassName: "whitespace-nowrap", cell: (m) => <StaffStatusPill status={m.status} /> },
    { id: "tfa", header: "Two-factor", cellClassName: "whitespace-nowrap", cell: (m) => <TwoFactor member={m} /> },
    { id: "last", header: "Last sign-in", cellClassName: "whitespace-nowrap", cell: (m) => <LastSignIn member={m} ctx={ctx} /> },
    { id: "actions", header: "Actions", srOnlyHeader: true, cell: (m) => <StaffRowActions member={m} ctx={ctx} /> },
  ];
}

/** Phone card: identity + status · role + two-factor · last sign-in · actions. */
export function StaffCard({ member, ctx }: { member: StaffMember; ctx: StaffRowContext }) {
  const { primary, secondary } = lastSignIn(member, ctx);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <Identity member={member} ctx={ctx} />
        </div>
        <StaffStatusPill status={member.status} />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <RolePill member={member} />
        <TwoFactor member={member} />
      </div>

      <div className="flex min-w-0 flex-col gap-0.5 text-xs">
        <span className="text-text-muted">Last sign-in</span>
        <span className="text-sm font-semibold">{primary}</span>
        {secondary ? <span className="truncate text-text-muted">{secondary}</span> : null}
      </div>

      <StaffRowActions member={member} ctx={ctx} stretch />
    </div>
  );
}

/** Loading placeholder for both layouts: table rows from md, stacked cards below. */
export function StaffListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading staff">
      <div className="hidden md:block">
        <div className="flex h-10 items-center gap-8 bg-surface-muted px-5">
          {[24, 14, 14, 16, 22].map((w, i) => (
            <Skeleton key={i} className="h-3" style={{ width: `${w * 4}px` }} />
          ))}
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex h-[69px] items-center gap-8 border-t border-divider px-5">
            <div className="flex w-[240px] shrink-0 items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-pill" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
            <Skeleton className="h-6 w-24 rounded-lg" />
            <Skeleton className="h-6 w-20 rounded-pill" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="ml-auto h-11 w-24 rounded-nav" />
          </div>
        ))}
      </div>

      <ul className="flex flex-col gap-3 p-3 sm:p-4 md:hidden">
        {Array.from({ length: Math.min(rows, 4) }, (_, i) => (
          <li key={i} className="flex flex-col gap-3 rounded-control border border-border p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 shrink-0 rounded-pill" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-6 w-16 rounded-pill" />
            </div>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-9 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-11 flex-1 rounded-nav" />
              <Skeleton className="size-11 rounded-nav" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
