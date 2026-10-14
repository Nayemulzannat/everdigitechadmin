import Link from "next/link";
import { LogIn } from "lucide-react";
import { toApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";
import { Can } from "@/components/auth";
import { Avatar, Button, Skeleton, StatusPill, buttonVariants, type StatusTone, type TableColumn } from "@/components/ui";
import { CLIENT_GROUP_LABELS, useImpersonateClient, type Client, type ClientStatus } from "@/lib/api/clients";
import { cn } from "@/lib/cn";
import { formatBDT, formatShortDate } from "@/lib/format";

const STATUS: Record<ClientStatus, { label: string; tone: StatusTone }> = {
  active: { label: "Active", tone: "success" },
  inactive: { label: "Inactive", tone: "warning" },
  closed: { label: "Closed", tone: "neutral" },
};

function ClientStatusPill({ status }: { status: ClientStatus }) {
  return <StatusPill tone={STATUS[status].tone}>{STATUS[status].label}</StatusPill>;
}

/** "৳1,800 overdue" in danger, "৳1,450" normal, "—" when nothing is due. */
function BalanceDue({ client }: { client: Client }) {
  if (client.balanceDue === 0) return <span className="text-text-muted">—</span>;
  return (
    <span className={client.overdue ? "text-danger" : "text-text"}>
      {formatBDT(client.balanceDue)}
      {client.overdue ? " overdue" : ""}
    </span>
  );
}

function GroupTag({ client }: { client: Client }) {
  return (
    <span className="rounded-lg bg-neutral-soft px-2.5 py-1 text-xs font-bold whitespace-nowrap text-text-secondary">
      {CLIENT_GROUP_LABELS[client.group]}
    </span>
  );
}

const clientHref = (client: Client) => `/clients/${client.id}`;

/**
 * "Log in as client": asks the API for a one-minute link and opens it in a new tab (the client panel signs the staff
 * member in as the account owner and shows a banner). The tab is opened first, in the click itself, because browsers
 * block a window.open that happens after an await.
 */
function LoginAsClientButton({ client }: { client: Client }) {
  const impersonate = useImpersonateClient();
  const closed = client.status === "closed";

  const onClick = () => {
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null; // the client panel must not be able to reach back into the admin panel

    impersonate.mutate({ id: client.id }, {
      onSuccess: ({ url }) => {
        if (tab) tab.location.href = url;
        else toast({ title: "Pop-up blocked", description: "Allow pop-ups for this site, then try again.", tone: "warning" });
      },
      onError: (error) => {
        tab?.close();
        toast({ title: `Could not sign in as ${client.name}`, description: toApiError(error).message, tone: "danger" });
      },
    });
  };

  return (
    <Button
      iconOnly
      variant="secondary"
      aria-label={`Log in as ${client.name}`}
      title={closed ? "Closed accounts can't be signed in to" : "Log in as client"}
      className="rounded-nav"
      loading={impersonate.isPending}
      disabled={closed}
      onClick={onClick}
    >
      <LogIn aria-hidden="true" className="size-4" />
    </Button>
  );
}

/** View + "Log in as client". `stretch` makes View fill the row on phone cards. */
function ClientActions({ client, stretch = false }: { client: Client; stretch?: boolean }) {
  return (
    <div className={cn("flex gap-1.5", stretch ? "gap-2" : "justify-end")}>
      <Link
        href={clientHref(client)}
        aria-label={`View ${client.name}`}
        className={buttonVariants({ variant: "secondary", className: cn("rounded-nav text-[13px]", stretch ? "flex-1" : "px-3.5") })}
      >
        View
      </Link>
      <Can permission="clients.login_as">
        <LoginAsClientButton client={client} />
      </Can>
    </div>
  );
}

export const clientColumns: TableColumn<Client>[] = [
  {
    id: "client",
    header: "Client",
    // Keeps name + email readable while the table scrolls sideways on tablets.
    headerClassName: "min-w-[220px]",
    cell: (c) => (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={c.name} />
        <div className="flex min-w-0 flex-col">
          <Link href={clientHref(c)} className="-my-3 block truncate py-3 font-bold text-text no-underline hover:text-primary">
            {c.name}
          </Link>
          <span title={c.email} className="max-w-[160px] truncate text-xs text-text-muted">
            {c.email}
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "company",
    header: "Company",
    cellClassName: "text-text-secondary",
    cell: (c) => c.company ?? <span className="text-text-muted">—</span>,
  },
  { id: "services", header: "Services", align: "right", cellClassName: "font-bold tabular-nums", cell: (c) => c.services },
  { id: "domains", header: "Domains", align: "right", cellClassName: "font-bold tabular-nums", cell: (c) => c.domains },
  {
    id: "due",
    header: "Balance due",
    // Wraps to two lines like the design, so the table fits at 1440 without scrolling.
    headerClassName: "whitespace-normal",
    align: "right",
    cellClassName: "font-bold whitespace-nowrap tabular-nums",
    cell: (c) => <BalanceDue client={c} />,
  },
  { id: "group", header: "Group", cell: (c) => <GroupTag client={c} /> },
  { id: "status", header: "Status", cellClassName: "whitespace-nowrap", cell: (c) => <ClientStatusPill status={c.status} /> },
  { id: "joined", header: "Joined", cellClassName: "whitespace-nowrap text-text-muted", cell: (c) => formatShortDate(c.joinedOn) },
  { id: "actions", header: "Actions", srOnlyHeader: true, cell: (c) => <ClientActions client={c} /> },
];

/** Phone card: identity + status · services/domains/balance · group + joined · actions. */
export function ClientCard({ client }: { client: Client }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <Avatar name={client.name} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Link href={clientHref(client)} className="-my-3 block truncate py-3 font-bold text-text no-underline">
            {client.name}
          </Link>
          <span className="truncate text-xs text-text-muted">{client.email}</span>
        </div>
        <ClientStatusPill status={client.status} />
      </div>

      <dl className="grid grid-cols-[1fr_1fr_1.6fr] gap-2 text-xs">
        <div className="flex flex-col gap-0.5">
          <dt className="text-text-muted">Services</dt>
          <dd className="text-sm font-bold tabular-nums">{client.services}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-text-muted">Domains</dt>
          <dd className="text-sm font-bold tabular-nums">{client.domains}</dd>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-text-muted">Balance due</dt>
          <dd className="truncate text-sm font-bold tabular-nums">
            <BalanceDue client={client} />
          </dd>
        </div>
      </dl>

      <div className="flex min-w-0 items-center gap-2 text-xs text-text-muted">
        <GroupTag client={client} />
        <span className="truncate">
          {client.company ? `${client.company} · ` : ""}Joined {formatShortDate(client.joinedOn)}
        </span>
      </div>

      <ClientActions client={client} stretch />
    </div>
  );
}

/** Loading placeholder for both layouts: table rows from md, stacked cards below. */
export function ClientsListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading clients">
      <div className="hidden md:block">
        <div className="flex h-10 items-center gap-6 bg-surface-muted px-5">
          {[24, 20, 14, 14, 18, 12, 14, 14].map((w, i) => (
            <Skeleton key={i} className="h-3" style={{ width: `${w * 4}px` }} />
          ))}
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex h-[69px] items-center gap-6 border-t border-divider px-5">
            <div className="flex w-[260px] shrink-0 items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-pill" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16 rounded-lg" />
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
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
            <Skeleton className="h-4 w-3/4" />
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
