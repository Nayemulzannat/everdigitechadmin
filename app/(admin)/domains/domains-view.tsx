"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Can } from "@/components/auth";
import { PageHeader } from "@/components/layout";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Dialog,
  EmptyState,
  Input,
  Pagination,
  ResponsiveTable,
  SearchInput,
  Select,
  Skeleton,
  StatusPill,
  Tabs,
  buttonVariants,
  type StatusTone,
  type TableColumn,
} from "@/components/ui";
import { useClients } from "@/lib/api/clients";
import { DOMAIN_STATUS_LABELS, useCreateDomain, useDeleteDomain, useDomain, useDomains, useUpdateDomain, type Domain, type DomainFilter, type DomainInput, type DomainStatus } from "@/lib/api/domains";
import { toApiError } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatCount, formatShortDate } from "@/lib/format";
import { toast } from "@/lib/toast";

const LIST_ID = "domains-list";
const FORM_ID = "domain-form";

const TABS: { value: DomainFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Ending soon" },
  { value: "pending", label: "Pending" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

const TONES: Record<DomainStatus, StatusTone> = { pending: "warning", active: "success", expired: "danger", cancelled: "neutral" };

function DaysLeft({ domain }: { domain: Domain }) {
  if (domain.daysLeft === null) return <span className="text-text-muted">-</span>;
  if (domain.daysLeft < 0) return <span className="text-danger">Ended {Math.abs(domain.daysLeft)} days ago</span>;
  return <span className={domain.daysLeft <= 30 && domain.status === "active" ? "font-bold text-warning" : "text-text-muted"}>{domain.daysLeft} days left</span>;
}

type Mode = { type: "create" } | { type: "edit"; id: string };

export function DomainsView() {
  const [status, setStatus] = useState<DomainFilter>("all");
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);
  const [deleting, setDeleting] = useState<Domain | null>(null);
  const { data, isPending, isError, isPlaceholderData, refetch, isRefetching } = useDomains({ page, status, search });

  // The search box is written to the query 300ms after typing stops.
  useEffect(() => {
    if (draft.trim() === search.trim()) return;
    const timer = window.setTimeout(() => {
      setSearch(draft);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [draft, search]);

  const columns: TableColumn<Domain>[] = [
    {
      id: "name",
      header: "Domain",
      headerClassName: "min-w-[200px]",
      cell: (d) => (
        <div className="flex min-w-0 flex-col">
          <button type="button" onClick={() => setMode({ type: "edit", id: d.id })} className="-my-3 block max-w-[260px] truncate py-3 text-left font-bold text-text hover:text-primary">
            {d.name}
          </button>
          <span className="text-xs text-text-muted">{d.registrar === "dynadot" ? "Dynadot" : "Manual"}</span>
        </div>
      ),
    },
    { id: "account", header: "Client", cellClassName: "max-w-[200px] truncate text-text-secondary", cell: (d) => d.account.name ?? "-" },
    { id: "status", header: "Status", cellClassName: "whitespace-nowrap", cell: (d) => <StatusPill tone={TONES[d.status]}>{DOMAIN_STATUS_LABELS[d.status]}</StatusPill> },
    { id: "expires", header: "Expires", cellClassName: "whitespace-nowrap", cell: (d) => (d.expiresAt ? formatShortDate(d.expiresAt) : "-") },
    { id: "left", header: "", srOnlyHeader: true, cellClassName: "whitespace-nowrap text-xs", cell: (d) => <DaysLeft domain={d} /> },
    {
      id: "actions",
      header: "Actions",
      srOnlyHeader: true,
      cell: (d) => (
        <div className="flex justify-end gap-1.5">
          <Can permission="domains.edit">
            <Button iconOnly variant="secondary" size="sm" aria-label={`Edit ${d.name}`} onClick={() => setMode({ type: "edit", id: d.id })}>
              <Pencil aria-hidden="true" className="size-4" />
            </Button>
          </Can>
          <Can permission="domains.delete">
            <Button iconOnly variant="secondary" size="sm" aria-label={`Remove ${d.name}`} onClick={() => setDeleting(d)}>
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  const first = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        eyebrow="Business"
        title="Domains"
        description="The domain names of the clients, when they end, and who owns them."
        actions={
          <>
            <Link href="/domains/extensions" className={buttonVariants({ variant: "secondary" })}>
              <Tag aria-hidden="true" className="mr-2 size-4" />
              Extensions and prices
            </Link>
            <Can permission="domains.create">
              <Button leadingIcon={<Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />} onClick={() => setMode({ type: "create" })}>
                Add domain
              </Button>
            </Can>
          </>
        }
      />

      <Card padding="none">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:flex-row md:flex-wrap md:items-center md:justify-between md:px-5">
          <Tabs
            aria-label="Domain status"
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            items={TABS.map((t) => ({ ...t, count: data ? formatCount(data.counts[t.value]) : undefined, panelId: LIST_ID }))}
          />
          <form role="search" onSubmit={(e) => e.preventDefault()} className="min-w-0 md:w-[300px]">
            <SearchInput label="Search domains" placeholder="Domain or client" value={draft} onChange={(e) => setDraft(e.target.value)} enterKeyHint="search" />
          </form>
        </div>

        {isError && !data ? (
          <div className="p-4 md:p-5">
            <Alert tone="danger" role="alert" title="Domains couldn't be loaded">
              <div className="flex flex-col items-start gap-3">
                <span>Check your connection and try again.</span>
                <Button variant="secondary" size="sm" loading={isRefetching} onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            </Alert>
          </div>
        ) : isPending ? (
          <div role="status" aria-label="Loading domains" className="flex flex-col">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex h-[60px] items-center gap-6 border-t border-divider px-5 first:border-t-0">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-20 rounded-pill" />
              </div>
            ))}
          </div>
        ) : (
          <ResponsiveTable
            id={LIST_ID}
            caption="Domains"
            columns={columns}
            rows={data.items}
            getRowKey={(d) => d.id}
            minWidth={820}
            compact
            className={cn("transition-opacity", isPlaceholderData && "opacity-60")}
            renderMobileRow={(d) => (
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => setMode({ type: "edit", id: d.id })} className="text-left font-bold break-all text-text">
                    {d.name}
                  </button>
                  <StatusPill tone={TONES[d.status]}>{DOMAIN_STATUS_LABELS[d.status]}</StatusPill>
                </div>
                <p className="text-xs text-text-muted">
                  {d.account.name} · {d.expiresAt ? `Expires ${formatShortDate(d.expiresAt)}` : "No date"} · <DaysLeft domain={d} />
                </p>
              </div>
            )}
            empty={<EmptyState title="No domains here" text={search || status !== "all" ? "Try another status, or clear the search." : "Domains clients register will appear here. You can also add one you registered yourself."} />}
            footer={
              data.total > 0 ? (
                <>
                  <span aria-live="polite" className="text-[13px] text-text-muted">
                    Showing {formatCount(first)}-{formatCount(last)} of {formatCount(data.total)} {data.total === 1 ? "domain" : "domains"}
                  </span>
                  <Pagination page={data.page} pageCount={data.pageCount} onPageChange={setPage} />
                </>
              ) : undefined
            }
          />
        )}
      </Card>

      {mode ? <DomainDialog key={mode.type === "edit" ? mode.id : "new"} mode={mode} onClose={() => setMode(null)} /> : null}
      <RemoveDialog domain={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function DomainDialog({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const id = mode.type === "edit" ? mode.id : null;
  const detail = useDomain(id);

  if (id !== null && !detail.data) {
    return (
      <Dialog open onClose={onClose} size="lg" title="Domain">
        {detail.isError ? (
          <Alert tone="danger" role="alert">
            {toApiError(detail.error).message}
          </Alert>
        ) : (
          <div role="status" aria-label="Loading" className="flex flex-col gap-3">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
      </Dialog>
    );
  }

  return <DomainForm domain={detail.data ?? null} onClose={onClose} />;
}

function DomainForm({ domain, onClose }: { domain: Domain | null; onClose: () => void }) {
  const create = useCreateDomain();
  const update = useUpdateDomain();
  const [accountId, setAccountId] = useState(domain?.account.id ?? "");
  const [accountSearch, setAccountSearch] = useState("");
  const [name, setName] = useState(domain?.name ?? "");
  const [registrar, setRegistrar] = useState<DomainInput["registrar"]>(domain?.registrar ?? "manual");
  const [status, setStatus] = useState<DomainStatus>(domain?.status ?? "active");
  const [registeredAt, setRegisteredAt] = useState(domain?.registeredAt ?? "");
  const [expiresAt, setExpiresAt] = useState(domain?.expiresAt ?? "");
  const [nameservers, setNameservers] = useState((domain?.nameservers ?? []).join("\n"));
  const [autoRenew, setAutoRenew] = useState(domain?.autoRenew ?? true);
  const [locked, setLocked] = useState(domain?.locked ?? true);
  const [whoisPrivacy, setWhoisPrivacy] = useState(domain?.whoisPrivacy ?? true);
  const [notes, setNotes] = useState(domain?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState("");

  // The accounts to choose from: the clients list, narrowed by what is typed.
  const accounts = useClients({ page: 1, status: "all", group: "all", search: accountSearch });
  const options = accounts.data?.items ?? [];

  function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setBanner("");
    const found: Record<string, string> = {};
    if (!accountId) found.accountId = "Choose the client who owns it.";
    if (!name.trim()) found.name = "Enter the domain name, like mybrand.com.";
    if (Object.keys(found).length) return setErrors(found);

    const input: DomainInput = {
      accountId: Number(accountId),
      name: name.trim(),
      registrar,
      status,
      registeredAt: registeredAt || null,
      expiresAt: expiresAt || null,
      autoRenew,
      locked,
      whoisPrivacy,
      nameservers: nameservers.split("\n").map((l) => l.trim()).filter(Boolean),
      notes: notes.trim() || null,
    };
    const handlers = {
      onSuccess: () => {
        toast({ title: domain ? "Domain saved" : "Domain added", tone: "success" });
        onClose();
      },
      onError: (raw: unknown) => {
        const error = toApiError(raw);
        const fields: Record<string, string> = {};
        for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) fields[field.replace(/\.\d+$/, "")] = messages[0] ?? error.message;
        if (Object.keys(fields).length) setErrors(fields);
        else setBanner(error.message);
      },
    };

    if (domain) update.mutate({ id: domain.id, input }, handlers);
    else create.mutate(input, handlers);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={domain ? domain.name : "Add a domain"}
      description={domain ? undefined : "A domain registered outside the website, or by hand, that a client owns."}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Can permission={domain ? "domains.edit" : "domains.create"}>
            <Button type="submit" form={FORM_ID} loading={create.isPending || update.isPending}>
              {domain ? "Save changes" : "Add domain"}
            </Button>
          </Can>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate className="flex flex-col gap-4">
        {banner ? (
          <Alert tone="danger" role="alert">
            {banner}
          </Alert>
        ) : null}

        <Input label="Domain name" value={name} maxLength={253} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="mybrand.com" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Find the client" value={accountSearch} onChange={(e) => setAccountSearch(e.target.value)} placeholder="Name, company or email" hint={domain ? `Now: ${domain.account.name}` : undefined} />
          <Select label="Client" value={accountId} onChange={(e) => setAccountId(e.target.value)} error={errors.accountId}>
            <option value="">Choose a client</option>
            {domain && !options.some((o) => o.id === domain.account.id) ? <option value={domain.account.id}>{domain.account.name}</option> : null}
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.email})
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as DomainStatus)} error={errors.status}>
            {(Object.keys(DOMAIN_STATUS_LABELS) as DomainStatus[]).map((s) => (
              <option key={s} value={s}>
                {DOMAIN_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Input label="Registered on" type="date" value={registeredAt} onChange={(e) => setRegisteredAt(e.target.value)} error={errors.registeredAt} />
          <Input label="Expires on" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} error={errors.expiresAt} />
        </div>

        <Select label="Registered at" value={registrar} onChange={(e) => setRegistrar(e.target.value as DomainInput["registrar"])} className="sm:max-w-xs">
          <option value="manual">Somewhere else (manual)</option>
          <option value="dynadot">Dynadot</option>
        </Select>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="domain-ns" className="text-sm font-semibold">
            Name servers
          </label>
          <textarea id="domain-ns" value={nameservers} rows={3} onChange={(e) => setNameservers(e.target.value)} placeholder={"ns1.example.com\nns2.example.com"} className={cn("w-full resize-y rounded-control border border-input-border bg-surface p-3 text-sm outline-none focus:border-primary", errors.nameservers && "border-danger")} />
          {errors.nameservers ? <p className="text-[13px] font-semibold text-danger">{errors.nameservers}</p> : <p className="text-[13px] text-text-muted">One for each line, up to 6.</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Checkbox label="Renew it automatically" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} />
          <Checkbox label="Locked (cannot be transferred away)" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
          <Checkbox label="WHOIS privacy on" checked={whoisPrivacy} onChange={(e) => setWhoisPrivacy(e.target.checked)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="domain-notes" className="text-sm font-semibold">
            Notes for staff
          </label>
          <textarea id="domain-notes" value={notes} rows={2} maxLength={2000} onChange={(e) => setNotes(e.target.value)} className="w-full resize-y rounded-control border border-input-border bg-surface p-3 text-sm outline-none focus:border-primary" />
        </div>

        {domain?.events && domain.events.length > 0 ? (
          <div className="flex flex-col gap-1.5 border-t border-border pt-4">
            <p className="text-sm font-semibold">History</p>
            <ul className="m-0 list-none p-0 text-[13px] text-text-muted">
              {domain.events.map((event, i) => (
                <li key={i}>
                  {formatShortDate(event.createdAt.slice(0, 10))}: {event.type}
                  {event.by ? ` by ${event.by}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </form>
    </Dialog>
  );
}

function RemoveDialog({ domain, onClose }: { domain: Domain | null; onClose: () => void }) {
  const remove = useDeleteDomain();

  function close() {
    remove.reset();
    onClose();
  }

  return (
    <Dialog
      open={domain !== null}
      onClose={close}
      title={`Remove ${domain?.name ?? ""}?`}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="danger-outline"
            loading={remove.isPending}
            onClick={() =>
              domain &&
              remove.mutate(domain.id, {
                onSuccess: () => {
                  toast({ title: "Domain removed", tone: "success" });
                  close();
                },
              })
            }
          >
            Remove domain
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {remove.error ? (
          <Alert tone="danger" role="alert">
            {toApiError(remove.error).message}
          </Alert>
        ) : null}
        <p className="text-[15px] text-text-secondary">It leaves this list. The domain itself is not cancelled at the registrar.</p>
      </div>
    </Dialog>
  );
}
