"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Plus, SlidersHorizontal } from "lucide-react";
import { Can } from "@/components/auth";
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
  Tabs,
} from "@/components/ui";
import { CLIENT_GROUPS, CLIENT_GROUP_LABELS, useClients, type ClientGroup, type ClientsParams } from "@/lib/api/clients";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";
import { ClientCard, ClientsListSkeleton, clientColumns } from "./_components/clients-list";
import { useClientFilters } from "./_components/use-client-filters";

const SEARCH_DEBOUNCE_MS = 300;
const LIST_ID = "clients-list";

const STATUS_TABS: { value: ClientsParams["status"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "closed", label: "Closed" },
];

function GroupOptions() {
  return (
    <>
      <option value="all">All groups</option>
      {CLIENT_GROUPS.map((g) => (
        <option key={g} value={g}>
          {CLIENT_GROUP_LABELS[g]}
        </option>
      ))}
    </>
  );
}

export function ClientsView() {
  const { filters, setFilters, clearFilters, hasFilters } = useClientFilters();
  const { data, isPending, isError, isPlaceholderData, refetch, isRefetching } = useClients(filters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const listRef = useRef<HTMLElement>(null);

  // Search box: local draft, written to the URL 300ms after typing stops.
  // When the URL changes from elsewhere (back button, Clear filters) the draft follows it; the URL change from
  // our own debounced write is ignored so it can't overwrite characters typed in the meantime.
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
    // Bring the top of the list back into view when paging from the bottom.
    const top = listRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) listRef.current?.scrollIntoView({ block: "start" });
  }

  function clearAll() {
    setDraft("");
    setLastWritten(null);
    clearFilters();
  }

  const groupActive = filters.group !== "all";
  const counts = data?.counts;
  const tabs = STATUS_TABS.map((t) => ({
    ...t,
    count: counts ? formatCount(counts[t.value]) : undefined,
    panelId: LIST_ID,
  }));

  const first = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        eyebrow="Business"
        title="Clients"
        description="Everyone who has an account with EverDigitech, with their services, balance and status."
        actions={
          <>
            {/* Phone: icon-only Export next to a full "Add client". */}
            <Button iconOnly variant="secondary" aria-label="Export clients" className="sm:hidden">
              <Download aria-hidden="true" className="size-4" />
            </Button>
            <Button variant="secondary" leadingIcon={<Download aria-hidden="true" className="size-4" />} className="max-sm:hidden">
              Export
            </Button>
            <Can permission="clients.create">
              <Button leadingIcon={<Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />} className="max-sm:flex-1">
                Add client
              </Button>
            </Can>
          </>
        }
      />

      <Card padding="none" ref={listRef} className="scroll-mt-20 lg:scroll-mt-24">
        {/* Toolbar. Phone: tabs · search · Filters button. md+: tabs left, group + search right (wraps if tight). */}
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:flex-row md:flex-wrap md:items-center md:justify-between md:px-5">
          <Tabs
            aria-label="Client status"
            value={filters.status}
            onValueChange={(status) => setFilters({ status })}
            items={tabs}
          />
          <div className="flex flex-col gap-2.5 md:ml-auto md:flex-row md:items-center">
            <Select
              label="Client group"
              hideLabel
              value={filters.group}
              onChange={(e) => setFilters({ group: e.target.value as ClientGroup | "all" })}
              className="max-md:hidden md:w-44"
            >
              <GroupOptions />
            </Select>
            <form role="search" onSubmit={(e) => e.preventDefault()} className="min-w-0 md:w-[300px]">
              <SearchInput
                label="Search clients"
                placeholder="Name, email or company"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                enterKeyHint="search"
              />
            </form>
            <Button
              variant="secondary"
              aria-haspopup="dialog"
              leadingIcon={<SlidersHorizontal aria-hidden="true" className="size-4" />}
              trailingIcon={groupActive ? <Badge count={1} aria-label="1 filter applied" /> : undefined}
              onClick={() => setFiltersOpen(true)}
              className="self-start md:hidden"
            >
              Filters
            </Button>
          </div>
        </div>

        {isError && !data ? (
          <div className="p-4 md:p-5">
            <Alert tone="danger" role="alert" title="Clients couldn't be loaded">
              <div className="flex flex-col items-start gap-3">
                <span>Check your connection and try again.</span>
                <Button variant="secondary" size="sm" loading={isRefetching} onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            </Alert>
          </div>
        ) : isPending ? (
          <ClientsListSkeleton />
        ) : (
          <ResponsiveTable
            id={LIST_ID}
            caption="Clients"
            columns={clientColumns}
            rows={data.items}
            getRowKey={(c) => c.id}
            renderMobileRow={(c) => <ClientCard client={c} />}
            minWidth={1000}
            compact
            className={cn("transition-opacity", isPlaceholderData && "opacity-60")}
            empty={
              <EmptyState
                title="No clients match this filter"
                text="Try another status or group, or clear the search."
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
                    Showing {formatCount(first)}–{formatCount(last)} of {formatCount(data.total)} {data.total === 1 ? "client" : "clients"}
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
        description="Narrow the client list."
        footer={
          <>
            <Button variant="ghost" disabled={!groupActive} onClick={() => setFilters({ group: "all" })}>
              Reset
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>Show results</Button>
          </>
        }
      >
        <Select
          label="Client group"
          value={filters.group}
          onChange={(e) => setFilters({ group: e.target.value as ClientGroup | "all" })}
        >
          <GroupOptions />
        </Select>
      </Sheet>
    </div>
  );
}
