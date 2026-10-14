"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Can } from "@/components/auth";
import { PageHeader } from "@/components/layout";
import { Alert, Button, Card, buttonVariants, EmptyState, Pagination, ResponsiveTable, SearchInput, Select, Skeleton, Tabs, type TableColumn } from "@/components/ui";
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  useTicketOptions,
  useTickets,
  type Ticket,
  type TicketsParams,
} from "@/lib/api/tickets";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";
import { TicketAlertSettings } from "./_components/ticket-alert-settings";
import { TicketPriorityText, TicketStatusPill, whenLabel } from "./_components/parts";
import { useTicketFilters } from "./_components/use-ticket-filters";

const SEARCH_DEBOUNCE_MS = 300;
const LIST_ID = "tickets-list";

const STATUS_TABS: { value: TicketsParams["status"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Waiting for support" },
  { value: "answered", label: "Answered" },
  { value: "closed", label: "Closed" },
];

const ticketHref = (ticket: Ticket) => `/tickets/${ticket.id}`;

const columns: TableColumn<Ticket>[] = [
  {
    id: "ticket",
    header: "Ticket",
    headerClassName: "min-w-[240px]",
    cell: (t) => (
      <div className="flex min-w-0 flex-col">
        <Link href={ticketHref(t)} className="-my-3 block max-w-[320px] truncate py-3 font-bold text-text no-underline hover:text-primary">
          {t.subject}
        </Link>
        <span className="text-xs text-text-muted">{t.number}</span>
      </div>
    ),
  },
  {
    id: "client",
    header: "Client",
    cell: (t) => (
      <div className="flex min-w-0 flex-col">
        <span className="max-w-[180px] truncate font-semibold">{t.client.accountName ?? "—"}</span>
        <span className="max-w-[180px] truncate text-xs text-text-muted">{t.client.openedBy?.name}</span>
      </div>
    ),
  },
  { id: "department", header: "Department", cellClassName: "whitespace-nowrap text-text-secondary", cell: (t) => t.department.name },
  { id: "status", header: "Status", cellClassName: "whitespace-nowrap", cell: (t) => <TicketStatusPill status={t.status} /> },
  { id: "priority", header: "Priority", cell: (t) => <TicketPriorityText priority={t.priority} /> },
  {
    id: "assigned",
    header: "Assigned to",
    cellClassName: "whitespace-nowrap",
    cell: (t) => t.assignedTo?.name ?? <span className="text-text-muted">Unassigned</span>,
  },
  {
    id: "updated",
    header: "Last reply",
    cellClassName: "whitespace-nowrap text-text-muted",
    cell: (t) => (
      <span suppressHydrationWarning>
        {t.lastReplyBy === "client" ? "Client · " : "Staff · "}
        {whenLabel(t.lastReplyAt)}
      </span>
    ),
  },
];

/** Phone card: subject + status · client · assignee and time. */
function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <Link href={ticketHref(ticket)} className="-my-2 block py-2 font-bold break-words text-text no-underline">
            {ticket.subject}
          </Link>
          <span className="text-xs text-text-muted">
            {ticket.number} · {ticket.department.name}
          </span>
        </div>
        <TicketStatusPill status={ticket.status} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
        <span className="font-semibold text-text-secondary">{ticket.client.accountName}</span>
        <TicketPriorityText priority={ticket.priority} />
        <span>{ticket.assignedTo?.name ?? "Unassigned"}</span>
        <span suppressHydrationWarning>{whenLabel(ticket.lastReplyAt)}</span>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div role="status" aria-label="Loading tickets" className="flex flex-col">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex h-[69px] items-center gap-6 border-t border-divider px-5 first:border-t-0">
          <div className="flex w-[260px] flex-col gap-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-28 rounded-pill" />
          <Skeleton className="ml-auto h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export function TicketsView() {
  const { filters, setFilters, clearFilters, hasFilters } = useTicketFilters();
  const { data, isPending, isError, isPlaceholderData, refetch, isRefetching } = useTickets(filters);
  const options = useTicketOptions();

  // Search box: a local draft, written to the URL 300ms after typing stops (same approach as the clients list).
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

  const counts = data?.counts;
  const tabs = STATUS_TABS.map((t) => ({ ...t, count: counts ? formatCount(counts[t.value]) : undefined, panelId: LIST_ID }));
  const first = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        eyebrow="Support"
        title="Support tickets"
        description="Requests from clients. Answer them, assign them, and close them when they are done."
        actions={
          <>
            <TicketAlertSettings />
            <Can permission="tickets.edit">
              <Link href="/tickets/replies" className={buttonVariants({ variant: "secondary" })}>
                Saved replies
              </Link>
            </Can>
            <Link href="/tickets/departments" className={buttonVariants({ variant: "secondary" })}>
              Departments
            </Link>
          </>
        }
      />

      <Card padding="none">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:px-5">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
            <Tabs aria-label="Ticket status" value={filters.status} onValueChange={(status) => setFilters({ status })} items={tabs} />
            <form role="search" onSubmit={(e) => e.preventDefault()} className="min-w-0 md:w-[300px]">
              <SearchInput label="Search tickets" placeholder="Subject or ticket number" value={draft} onChange={(e) => setDraft(e.target.value)} enterKeyHint="search" />
            </form>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <Select label="Priority" hideLabel value={filters.priority} onChange={(e) => setFilters({ priority: e.target.value as TicketsParams["priority"] })}>
              <option value="all">All priorities</option>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {TICKET_PRIORITY_LABELS[p]} priority
                </option>
              ))}
            </Select>
            <Select label="Department" hideLabel value={filters.department} onChange={(e) => setFilters({ department: e.target.value })}>
              <option value="all">All departments</option>
              {options.data?.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
            <Select label="Assigned to" hideLabel value={filters.assigned} onChange={(e) => setFilters({ assigned: e.target.value })}>
              <option value="all">Anyone</option>
              <option value="me">Assigned to me</option>
              <option value="unassigned">Unassigned</option>
              {options.data?.assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {isError && !data ? (
          <div className="p-4 md:p-5">
            <Alert tone="danger" role="alert" title="Tickets couldn't be loaded">
              <div className="flex flex-col items-start gap-3">
                <span>Check your connection and try again.</span>
                <Button variant="secondary" size="sm" loading={isRefetching} onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            </Alert>
          </div>
        ) : isPending ? (
          <ListSkeleton />
        ) : (
          <ResponsiveTable
            id={LIST_ID}
            caption="Support tickets"
            columns={columns}
            rows={data.items}
            getRowKey={(t) => t.id}
            renderMobileRow={(t) => <TicketCard ticket={t} />}
            minWidth={1000}
            compact
            className={cn("transition-opacity", isPlaceholderData && "opacity-60")}
            empty={
              <EmptyState
                title={hasFilters ? "No tickets match these filters" : "No tickets yet"}
                text={hasFilters ? "Try another status or filter, or clear the search." : "When a client opens a ticket it appears here."}
                action={
                  hasFilters ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setDraft("");
                        setLastWritten(null);
                        clearFilters();
                      }}
                    >
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
                    Showing {formatCount(first)}–{formatCount(last)} of {formatCount(data.total)} {data.total === 1 ? "ticket" : "tickets"}
                  </span>
                  <Pagination page={data.page} pageCount={data.pageCount} onPageChange={(page) => setFilters({ ...filters, page })} />
                </>
              ) : undefined
            }
          />
        )}
      </Card>
    </div>
  );
}
