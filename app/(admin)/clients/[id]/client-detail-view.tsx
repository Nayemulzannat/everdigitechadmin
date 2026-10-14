"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, LogIn, Pencil } from "lucide-react";
import { Can } from "@/components/auth";
import { PageHeader } from "@/components/layout";
import { Alert, Avatar, Button, Card, Dialog, EmptyState, Input, Select, Skeleton, StatusPill, type StatusTone } from "@/components/ui";
import { CLIENT_GROUPS, CLIENT_GROUP_LABELS, CLIENT_STATUSES, useClient, useImpersonateClient, useUpdateClient, type ClientDetail, type ClientGroup, type ClientStatus } from "@/lib/api/clients";
import { toApiError } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatBDT, formatShortDate } from "@/lib/format";
import { toast } from "@/lib/toast";

const STATUS: Record<ClientStatus, { label: string; tone: StatusTone }> = {
  active: { label: "Active", tone: "success" },
  inactive: { label: "Inactive", tone: "warning" },
  closed: { label: "Closed", tone: "neutral" },
};

const TICKET_TONE = { open: "warning", answered: "success", closed: "neutral" } as const satisfies Record<string, StatusTone>;
const DOMAIN_TONE: Record<string, StatusTone> = { active: "success", pending: "warning", expired: "danger", cancelled: "neutral" };

const when = (iso: string | null) => (iso ? formatShortDate(iso.slice(0, 10)) : "Never");

function Tile({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "danger" }) {
  return (
    <Card padding="md" className="gap-1 md:gap-1">
      <p className="text-[13px] font-bold text-text-muted">{label}</p>
      <p className={cn("text-2xl font-extrabold tabular-nums", tone === "danger" && "text-danger")}>{value}</p>
      {note ? <p className="text-xs text-text-muted">{note}</p> : null}
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-32 shrink-0 text-[13px] text-text-muted">{label}</dt>
      <dd className="min-w-0 text-sm font-semibold break-words">{children}</dd>
    </div>
  );
}

export function ClientDetailView({ id }: { id: string }) {
  const { data, isPending, isError, error, refetch, isRefetching } = useClient(id);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const impersonate = useImpersonateClient();

  /** Opens the client panel in a new tab (the tab is opened first, in the click, so a browser does not block it). */
  function signInAs(client: ClientDetail, userId?: string) {
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;

    impersonate.mutate(
      { id: client.id, userId },
      {
        onSuccess: ({ url }) => {
          if (tab) tab.location.href = url;
          else toast({ title: "Pop-up blocked", description: "Allow pop-ups for this site, then try again.", tone: "warning" });
          setPicking(false);
        },
        onError: (e) => {
          tab?.close();
          toast({ title: `Could not sign in as ${client.name}`, description: toApiError(e).message, tone: "danger" });
        },
      },
    );
  }

  if (isError) {
    const apiError = toApiError(error);
    return (
      <div className="flex flex-col gap-4">
        <Link href="/clients" className="inline-flex w-fit items-center gap-1.5 text-sm font-bold text-text-muted no-underline hover:text-primary">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Clients
        </Link>
        <Alert tone="danger" role="alert" title={apiError.status === 404 ? "This client does not exist" : "The client couldn't be loaded"}>
          <div className="flex flex-col items-start gap-3">
            <span>{apiError.status === 404 ? "It may have been removed." : apiError.message}</span>
            {apiError.status !== 404 ? (
              <Button variant="secondary" size="sm" loading={isRefetching} onClick={() => refetch()}>
                Try again
              </Button>
            ) : null}
          </div>
        </Alert>
      </div>
    );
  }

  if (isPending) {
    return (
      <div role="status" aria-label="Loading client" className="flex flex-col gap-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const client = data;
  const closed = client.status === "closed";
  const hasTeam = client.members.filter((m) => m.status === "active").length > 1;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Link href="/clients" className="inline-flex w-fit items-center gap-1.5 text-sm font-bold text-text-muted no-underline hover:text-primary">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Clients
      </Link>

      <PageHeader
        eyebrow={client.company ?? "Client"}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {client.name}
            <StatusPill tone={STATUS[client.status].tone}>{STATUS[client.status].label}</StatusPill>
          </span>
        }
        description={`${CLIENT_GROUP_LABELS[client.group]} client, joined ${formatShortDate(client.joinedOn)}`}
        actions={
          <>
            <Can permission="clients.edit">
              <Button variant="secondary" leadingIcon={<Pencil aria-hidden="true" className="size-4" />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            </Can>
            <Can permission="clients.login_as">
              <Button
                leadingIcon={<LogIn aria-hidden="true" className="size-4" />}
                disabled={closed}
                title={closed ? "Closed accounts can't be signed in to" : undefined}
                loading={impersonate.isPending}
                onClick={() => (hasTeam ? setPicking(true) : signInAs(client))}
              >
                Log in as client
              </Button>
            </Can>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
        <Tile label="Services" value={String(client.stats.services)} />
        <Tile label="Balance due" value={client.stats.balanceDue ? formatBDT(client.stats.balanceDue) : "-"} note={client.stats.overdue ? "Some of it is overdue" : undefined} tone={client.stats.overdue ? "danger" : undefined} />
        <Tile label="Domains" value={String(client.stats.domains)} note={client.stats.domainsEndingSoon ? `${client.stats.domainsEndingSoon} ending within 30 days` : undefined} />
        <Tile label="Tickets" value={String(client.stats.tickets)} note={client.stats.ticketsOpen ? `${client.stats.ticketsOpen} waiting for support` : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <Card title="Owner">
          {client.owner ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar name={client.owner.name} />
                <div className="min-w-0">
                  <p className="font-bold">{client.owner.name}</p>
                  <p className="truncate text-sm text-text-muted">{client.owner.email}</p>
                </div>
              </div>
              <dl className="flex flex-col gap-2 m-0">
                <Row label="Phone">{client.owner.phone ?? "-"}</Row>
                <Row label="Email">{client.owner.emailVerified ? "Confirmed" : "Not confirmed"}</Row>
                <Row label="Two-factor">{client.owner.twoFactorOn ? "On" : "Off"}</Row>
                <Row label="Last sign-in">{when(client.owner.lastLoginAt)}</Row>
                {client.owner.suspended ? <Row label="Sign-in">Suspended</Row> : null}
              </dl>
            </div>
          ) : (
            <p className="text-sm text-text-muted">This account has no owner.</p>
          )}
        </Card>

        <Card title="Notes for staff" description="Only staff see this.">
          <p className={cn("whitespace-pre-wrap text-sm", !client.notes && "text-text-muted")}>{client.notes ?? "No notes yet."}</p>
        </Card>
      </div>

      <Card title={`Team (${client.members.length})`} padding="none">
        <ul className="divide-y divide-divider">
          {client.members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 md:px-5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{m.name ?? "Removed user"}</p>
                <p className="truncate text-xs text-text-muted">{m.email}</p>
              </div>
              <StatusPill tone={m.role === "owner" ? "info" : m.status === "active" ? "success" : "warning"}>{m.role === "owner" ? "Owner" : m.status === "active" ? "Member" : m.status === "invited" ? "Invited" : "Suspended"}</StatusPill>
              <span className="text-xs text-text-muted">Last sign-in: {when(m.lastLoginAt)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <Card
          title="Recent tickets"
          padding="none"
          action={
            client.stats.tickets > 0 ? (
              <Link href="/tickets" className="text-sm font-bold text-primary no-underline hover:underline">
                All tickets
              </Link>
            ) : undefined
          }
        >
          {client.recentTickets.length === 0 ? (
            <EmptyState title="No tickets" text="This client has not opened a ticket." />
          ) : (
            <ul className="divide-y divide-divider">
              {client.recentTickets.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3 md:px-5">
                  <div className="min-w-0 flex-1">
                    <Link href={`/tickets/${t.id}`} className="block truncate font-bold text-text no-underline hover:text-primary">
                      {t.subject}
                    </Link>
                    <span className="text-xs text-text-muted">
                      {t.number} · {when(t.lastReplyAt)}
                    </span>
                  </div>
                  <StatusPill tone={TICKET_TONE[t.status]}>{t.status === "open" ? "Waiting for support" : t.status === "answered" ? "Answered" : "Closed"}</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Domains"
          padding="none"
          action={
            client.stats.domains > 0 ? (
              <Link href="/domains" className="text-sm font-bold text-primary no-underline hover:underline">
                All domains
              </Link>
            ) : undefined
          }
        >
          {client.recentDomains.length === 0 ? (
            <EmptyState title="No domains" text="No domain is registered for this client yet." />
          ) : (
            <ul className="divide-y divide-divider">
              {client.recentDomains.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3 md:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{d.name}</p>
                    <span className="text-xs text-text-muted">{d.expiresAt ? `Expires ${formatShortDate(d.expiresAt)}` : "No date"}</span>
                  </div>
                  <StatusPill tone={DOMAIN_TONE[d.status] ?? "neutral"}>{d.status.charAt(0).toUpperCase() + d.status.slice(1)}</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Recent sign-ins" description="The last ten, for everyone on the team." padding="none">
        {client.recentLogins.length === 0 ? (
          <EmptyState title="No sign-ins yet" />
        ) : (
          <ul className="divide-y divide-divider">
            {client.recentLogins.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm md:px-5">
                <span className="w-44 shrink-0 font-semibold">{l.userName ?? "Unknown"}</span>
                <span className="text-text-muted">{[l.browser, l.platform].filter(Boolean).join(" on ") || "Unknown device"}</span>
                <span className="text-text-muted">{l.ip}</span>
                <span className="ml-auto flex items-center gap-2">
                  {l.impersonated ? <StatusPill tone="info">By staff</StatusPill> : null}
                  {l.successful ? <StatusPill tone="success">Signed in</StatusPill> : <StatusPill tone="danger">{l.failureReason?.replace(/_/g, " ") ?? "Failed"}</StatusPill>}
                  <span className="text-xs text-text-muted">{when(l.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing ? <EditDialog client={client} onClose={() => setEditing(false)} /> : null}

      <Dialog
        open={picking}
        onClose={() => setPicking(false)}
        title="Log in as which person?"
        description="They see the account as that person does. You can only do what they are allowed to do."
      >
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {client.members
            .filter((m) => m.status === "active")
            .map((m) => (
              <li key={m.id}>
                <Button variant="secondary" className="w-full justify-between" loading={impersonate.isPending} onClick={() => signInAs(client, m.userId)}>
                  <span className="truncate">{m.name}</span>
                  <span className="text-xs font-normal text-text-muted">{m.role === "owner" ? "Owner" : "Member"}</span>
                </Button>
              </li>
            ))}
        </ul>
      </Dialog>
    </div>
  );
}

function EditDialog({ client, onClose }: { client: ClientDetail; onClose: () => void }) {
  const update = useUpdateClient(client.id);
  const [name, setName] = useState(client.name);
  const [company, setCompany] = useState(client.company ?? "");
  const [group, setGroup] = useState<ClientGroup>(client.group);
  const [status, setStatus] = useState<ClientStatus>(client.status);
  const [notes, setNotes] = useState(client.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setBanner("");
    if (!name.trim()) return setErrors({ name: "Enter the client's name." });

    update.mutate(
      { name: name.trim(), company: company.trim() || null, group, status, notes: notes.trim() || null },
      {
        onSuccess: () => {
          toast({ title: "Client saved", tone: "success" });
          onClose();
        },
        onError: (raw) => {
          const error = toApiError(raw);
          const fields: Record<string, string> = {};
          for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) fields[field] = messages[0] ?? error.message;
          if (Object.keys(fields).length) setErrors(fields);
          else setBanner(error.message);
        },
      },
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={`Edit ${client.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="client-form" loading={update.isPending}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="client-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {banner ? (
          <Alert tone="danger" role="alert">
            {banner}
          </Alert>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Name" value={name} maxLength={255} onChange={(e) => setName(e.target.value)} error={errors.name} />
          <Input label="Company" value={company} maxLength={255} onChange={(e) => setCompany(e.target.value)} error={errors.company} placeholder="Optional" />
          <Select label="Group" value={group} onChange={(e) => setGroup(e.target.value as ClientGroup)} error={errors.group}>
            {CLIENT_GROUPS.map((g) => (
              <option key={g} value={g}>
                {CLIENT_GROUP_LABELS[g]}
              </option>
            ))}
          </Select>
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as ClientStatus)} error={errors.status}>
            {CLIENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS[s].label}
              </option>
            ))}
          </Select>
        </div>
        {status === "closed" ? <Alert tone="warning">A closed account cannot be signed in to by staff.</Alert> : null}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="client-notes" className="text-sm font-semibold">
            Notes for staff
          </label>
          <textarea id="client-notes" value={notes} rows={4} maxLength={5000} onChange={(e) => setNotes(e.target.value)} className="w-full resize-y rounded-control border border-input-border bg-surface p-3 text-sm outline-none focus:border-primary" />
        </div>
      </form>
    </Dialog>
  );
}
