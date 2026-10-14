"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Shield, SlidersHorizontal } from "lucide-react";
import { Can, useAuth } from "@/components/auth";
import { PageHeader } from "@/components/layout";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Pagination,
  ResponsiveTable,
  SearchInput,
  Select,
  Sheet,
  StatCardsSkeleton,
  Tabs,
  buttonVariants,
} from "@/components/ui";
import { toApiError } from "@/lib/api/errors";
import {
  useDeleteStaff,
  useResendStaffInvite,
  useStaff,
  useStaffRoles,
  useUpdateStaff,
  type StaffMember,
  type StaffParams,
} from "@/lib/api/staff";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";
import { toast } from "@/lib/toast";
import { StaffConfirmDialog } from "./_components/staff-confirm-dialog";
import { StaffFormDialog, type StaffFormMode } from "./_components/staff-form-dialog";
import { StaffCard, StaffListSkeleton, staffColumns, type StaffRowContext } from "./_components/staff-list";
import { StaffStatCards } from "./_components/staff-stats";
import { useStaffFilters } from "./_components/use-staff-filters";

const SEARCH_DEBOUNCE_MS = 300;
const LIST_ID = "staff-list";

const STATUS_TABS: { value: StaffParams["status"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "suspended", label: "Suspended" },
];

export function StaffView() {
  const { user, role, can } = useAuth();
  const { filters, setFilters, clearFilters, hasFilters } = useStaffFilters();
  const { data, isPending, isError, isPlaceholderData, refetch, isRefetching, dataUpdatedAt } = useStaff(filters);
  const rolesQuery = useStaffRoles();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [form, setForm] = useState<StaffFormMode | null>(null);
  const [suspending, setSuspending] = useState<StaffMember | null>(null);
  const [removing, setRemoving] = useState<StaffMember | null>(null);
  const listRef = useRef<HTMLElement>(null);

  const suspend = useUpdateStaff();
  const reactivate = useUpdateStaff();
  const remove = useDeleteStaff();
  const resend = useResendStaffInvite();

  // Search box: local draft, written to the URL 300ms after typing stops (same approach as the Clients page).
  const [draft, setDraft] = useState(filters.search);
  const [syncedSearch, setSyncedSearch] = useState(filters.search);
  const [lastWritten, setLastWritten] = useState<string | null>(null);
  if (filters.search !== syncedSearch) {
    setSyncedSearch(filters.search);
    if (filters.search !== lastWritten) setDraft(filters.search);
  }

  useEffect(() => {
    if (draft.trim() === filters.search.trim()) return;
    const timer = window.setTimeout(() => {
      setLastWritten(draft.trim());
      setFilters({ search: draft }, { history: "replace" });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, filters.search, setFilters]);

  function goToPage(page: number) {
    setFilters({ ...filters, page });
    const top = listRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) listRef.current?.scrollIntoView({ block: "start" });
  }

  function clearAll() {
    setDraft("");
    setLastWritten(null);
    clearFilters();
  }

  const viewer = useMemo(() => ({ id: user?.id ?? "", isSuperAdmin: role?.isSuperAdmin ?? false }), [user?.id, role?.isSuperAdmin]);

  const ctx: StaffRowContext | null = useMemo(() => {
    if (!data) return null;
    const writableInput = (m: StaffMember, status: "active" | "suspended") => ({
      id: m.id,
      data: { name: m.name, phone: m.phone, role: m.role?.id ?? "", status },
    });

    return {
      viewer,
      stats: data.stats,
      now: new Date(dataUpdatedAt).toISOString(),
      can: (permission) => can(permission),
      busyId: resend.isPending ? (resend.variables ?? null) : reactivate.isPending ? (reactivate.variables?.id ?? null) : null,
      onEdit: (m) => setForm({ type: "edit", member: m }),
      onSuspend: (m) => {
        suspend.reset();
        setSuspending(m);
      },
      onRemove: (m) => {
        remove.reset();
        setRemoving(m);
      },
      onReactivate: (m) =>
        reactivate.mutate(writableInput(m, "active"), {
          onSuccess: () => toast({ title: `${m.name} reactivated`, description: "They can sign in again.", tone: "success" }),
          onError: (e) => toast({ title: `Couldn't reactivate ${m.name}`, description: toApiError(e).message, tone: "danger" }),
        }),
      onResendInvite: (m) =>
        resend.mutate(m.id, {
          onSuccess: () => toast({ title: `Invite sent to ${m.email}`, tone: "success" }),
          onError: (e) => toast({ title: `Couldn't resend the invite`, description: toApiError(e).message, tone: "danger" }),
        }),
    };
  }, [data, dataUpdatedAt, viewer, can, resend, reactivate, suspend, remove]);

  const roleActive = filters.role !== "all";
  const counts = data?.counts;
  const tabs = STATUS_TABS.map((t) => ({
    ...t,
    count: counts ? formatCount(counts[t.value]) : undefined,
    panelId: LIST_ID,
  }));

  const first = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  const roleOptions = (
    <>
      <option value="all">All roles</option>
      {rolesQuery.data?.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </>
  );

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        eyebrow="Administration"
        title="Staff"
        description="People who can sign in to the admin console. What each person can do comes from their role."
        actions={
          <>
            <Can permission="roles.view">
              <Link href="/roles" className={buttonVariants({ variant: "secondary", className: "max-sm:w-full" })}>
                <Shield aria-hidden="true" className="size-4" />
                Manage roles
              </Link>
            </Can>
            <Can permission="staff.create">
              <Button
                leadingIcon={<Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />}
                onClick={() => setForm({ type: "create" })}
                className="max-sm:w-full"
              >
                Add staff member
              </Button>
            </Can>
          </>
        }
      />

      {data ? <StaffStatCards stats={data.stats} stale={isPlaceholderData} /> : isError ? null : <StatCardsSkeleton />}

      <Card padding="none" ref={listRef} className="scroll-mt-20 lg:scroll-mt-24">
        {/* Toolbar. Phone: tabs · search · Filters button. md+: tabs left, role + search right (wraps if tight). */}
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:flex-row md:flex-wrap md:items-center md:justify-between md:px-5">
          <Tabs aria-label="Staff status" value={filters.status} onValueChange={(status) => setFilters({ status })} items={tabs} />
          <div className="flex flex-col gap-2.5 md:ml-auto md:flex-row md:items-center">
            <Select
              label="Role"
              hideLabel
              value={filters.role}
              onChange={(e) => setFilters({ role: e.target.value })}
              className="max-md:hidden md:w-44"
            >
              {roleOptions}
            </Select>
            <form role="search" onSubmit={(e) => e.preventDefault()} className="min-w-0 md:w-[280px]">
              <SearchInput
                label="Search staff"
                placeholder="Name or email"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                enterKeyHint="search"
              />
            </form>
            <Button
              variant="secondary"
              aria-haspopup="dialog"
              leadingIcon={<SlidersHorizontal aria-hidden="true" className="size-4" />}
              trailingIcon={roleActive ? <Badge count={1} aria-label="1 filter applied" /> : undefined}
              onClick={() => setFiltersOpen(true)}
              className="self-start md:hidden"
            >
              Filters
            </Button>
          </div>
        </div>

        {isError && !data ? (
          <div className="p-4 md:p-5">
            <Alert tone="danger" role="alert" title="Staff couldn't be loaded">
              <div className="flex flex-col items-start gap-3">
                <span>Check your connection and try again.</span>
                <Button variant="secondary" size="sm" loading={isRefetching} onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            </Alert>
          </div>
        ) : isPending || !ctx || !data ? (
          <StaffListSkeleton />
        ) : (
          <ResponsiveTable
            id={LIST_ID}
            caption="Staff"
            columns={staffColumns(ctx)}
            rows={data.items}
            getRowKey={(m) => m.id}
            renderMobileRow={(m) => <StaffCard member={m} ctx={ctx} />}
            minWidth={960}
            compact
            className={cn("transition-opacity", isPlaceholderData && "opacity-60")}
            empty={
              <EmptyState
                title="No staff match this filter"
                text="Try another status or clear the search."
                action={
                  hasFilters ? (
                    <Button variant="secondary" onClick={clearAll}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            }
            footer={
              data.total > 0 ? (
                <>
                  <span aria-live="polite" className="text-[13px] text-text-muted">
                    Showing {formatCount(first)}–{formatCount(last)} of {formatCount(data.total)} staff {data.total === 1 ? "member" : "members"}
                  </span>
                  <Pagination page={data.page} pageCount={data.pageCount} onPageChange={goToPage} />
                </>
              ) : undefined
            }
          />
        )}
      </Card>

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        description="Narrow the staff list."
        footer={
          <>
            <Button variant="ghost" disabled={!roleActive} onClick={() => setFilters({ role: "all" })}>
              Reset
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>Show results</Button>
          </>
        }
      >
        <Select label="Role" value={filters.role} onChange={(e) => setFilters({ role: e.target.value })}>
          {roleOptions}
        </Select>
      </Sheet>

      <StaffFormDialog mode={form} viewer={viewer} activeSuperAdmins={data?.stats.activeSuperAdmins ?? 0} onClose={() => setForm(null)} />

      <StaffConfirmDialog
        open={suspending !== null}
        onClose={() => setSuspending(null)}
        title={suspending ? `Suspend ${suspending.name}?` : "Suspend"}
        confirmLabel="Suspend"
        loading={suspend.isPending}
        error={suspend.error}
        onConfirm={() => {
          if (!suspending) return;
          suspend.mutate(
            { id: suspending.id, data: { name: suspending.name, phone: suspending.phone, role: suspending.role?.id ?? "", status: "suspended" } },
            {
              onSuccess: () => {
                toast({ title: `${suspending.name} suspended`, description: "They were signed out and can't sign in until reactivated.", tone: "success" });
                setSuspending(null);
              },
            },
          );
        }}
      >
        <strong>{suspending?.name}</strong> will be signed out right away and can&apos;t sign in until you reactivate them. Their account and history are
        kept.
      </StaffConfirmDialog>

      <StaffConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={removing ? `Remove ${removing.name}?` : "Remove"}
        confirmLabel="Remove"
        loading={remove.isPending}
        error={remove.error}
        onConfirm={() => {
          if (!removing) return;
          remove.mutate(removing.id, {
            onSuccess: () => {
              toast({ title: `${removing.name} removed`, tone: "success" });
              setRemoving(null);
            },
          });
        }}
      >
        <strong>{removing?.name}</strong> will lose access to the admin console immediately and be signed out. The activity they&apos;ve recorded stays in
        the log.
      </StaffConfirmDialog>
    </div>
  );
}
