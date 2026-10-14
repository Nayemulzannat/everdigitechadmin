"use client";

import { useState, type ReactNode } from "react";
import {
  Bell,
  Download,
  FileText,
  LayoutDashboard,
  LogIn,
  Menu,
  Plus,
  Search,
  ServerCog,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardLink,
  Checkbox,
  Drawer,
  EmptyState,
  Input,
  Pagination,
  ResponsiveTable,
  SearchInput,
  SegmentedControl,
  Select,
  Sheet,
  StatusPill,
  Tabs,
  buttonVariants,
  type StatusTone,
  type TableColumn,
} from "@/components/ui";

// ---------- Sample data (from design/Clients.dc.html) ----------

type ClientStatus = "active" | "inactive" | "closed";

interface Client {
  id: number;
  name: string;
  email: string;
  company: string;
  services: number;
  domains: number;
  due: string;
  overdue: boolean;
  group: string;
  status: ClientStatus;
  joined: string;
}

const CLIENTS: Client[] = [
  { id: 1, name: "Rahim Uddin", email: "rahim@example.com", company: "Uddin Traders", services: 3, domains: 5, due: "", overdue: false, group: "Regular", status: "active", joined: "12 Jan 2024" },
  { id: 2, name: "Nusrat Jahan", email: "nusrat@example.com", company: "Nusrat Bakes", services: 1, domains: 2, due: "৳1,450", overdue: false, group: "Regular", status: "active", joined: "03 Mar 2025" },
  { id: 3, name: "Arif Hasan", email: "arif@technest.example", company: "TechNest Ltd", services: 6, domains: 14, due: "৳4,200", overdue: false, group: "Reseller", status: "active", joined: "18 Aug 2023" },
  { id: 4, name: "Sabbir Hossain", email: "sabbir@example.com", company: "—", services: 1, domains: 1, due: "", overdue: false, group: "Regular", status: "active", joined: "27 Sep 2026" },
  { id: 5, name: "Farhana Akter", email: "farhana@example.com", company: "Akter Fashion", services: 0, domains: 1, due: "৳1,800", overdue: true, group: "Regular", status: "inactive", joined: "09 May 2025" },
  { id: 6, name: "Mahmudul Hasan", email: "mahmud.hasan.longaddress@digicraft-agency.example", company: "DigiCraft Agency", services: 9, domains: 22, due: "", overdue: false, group: "VIP", status: "active", joined: "02 Feb 2022" },
  { id: 7, name: "Tanvir Ahmed", email: "tanvir@example.com", company: "—", services: 0, domains: 0, due: "", overdue: false, group: "Regular", status: "closed", joined: "14 Nov 2023" },
  { id: 8, name: "Sharmin Sultana", email: "sharmin@sultanaedu.example", company: "Sultana Edu", services: 2, domains: 2, due: "৳2,600", overdue: true, group: "Regular", status: "active", joined: "21 Jul 2024" },
];

const STATUS: Record<ClientStatus, { tone: StatusTone; label: string }> = {
  active: { tone: "success", label: "Active" },
  inactive: { tone: "warning", label: "Inactive" },
  closed: { tone: "neutral", label: "Closed" },
};

type StatusTab = "all" | ClientStatus;

const STATUS_TABS = [
  { value: "all", label: "All", count: "1,248" },
  { value: "active", label: "Active", count: "1,102" },
  { value: "inactive", label: "Inactive", count: "96" },
  { value: "closed", label: "Closed", count: "50" },
] satisfies { value: StatusTab; label: string; count: string }[];

// ---------- Small preview-only helpers ----------

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-extrabold">{title}</h2>
        {note ? <p className="text-[13px] text-text-muted">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Demo({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-xs font-bold tracking-[0.06em] text-text-subtle uppercase">{label}</span>
      <div className={className ?? "flex flex-wrap items-center gap-3"}>{children}</div>
    </div>
  );
}

/** Fixed chip showing the active Tailwind breakpoint. */
function BreakpointChip() {
  return (
    <div className="pointer-events-none fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 rounded-pill bg-text px-3 py-1 text-xs font-bold text-on-primary">
      <span className="sm:hidden">base &lt;640</span>
      <span className="hidden sm:inline md:hidden">sm ≥640</span>
      <span className="hidden md:inline lg:hidden">md ≥768</span>
      <span className="hidden lg:inline xl:hidden">lg ≥1024</span>
      <span className="hidden xl:inline 2xl:hidden">xl ≥1280</span>
      <span className="hidden 2xl:inline">2xl ≥1536</span>
    </div>
  );
}

function DueAmount({ client }: { client: Client }) {
  if (!client.due) return <span className="text-text-muted">—</span>;
  return (
    <span className={client.overdue ? "text-danger" : "text-text"}>
      {client.due}
      {client.overdue ? " overdue" : ""}
    </span>
  );
}

function GroupTag({ children }: { children: ReactNode }) {
  return <span className="rounded-lg bg-neutral-soft px-2.5 py-1 text-xs font-bold text-text-secondary">{children}</span>;
}

function ClientActions({ client, stretch = false }: { client: Client; stretch?: boolean }) {
  return (
    <div className={stretch ? "flex gap-2" : "flex justify-end gap-1.5"}>
      <a href="#" className={buttonVariants({ variant: "secondary", className: stretch ? "flex-1" : "rounded-nav px-3.5 text-[13px]" })}>
        View
      </a>
      <Button iconOnly variant="secondary" aria-label={`Log in as ${client.name}`} title="Log in as client" className="rounded-nav">
        <LogIn className="size-4" />
      </Button>
    </div>
  );
}

const clientColumns: TableColumn<Client>[] = [
  {
    id: "client",
    header: "Client",
    cell: (c) => (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={c.name} />
        <div className="flex min-w-0 flex-col">
          <a href="#" className="-my-3 block truncate py-3 font-bold text-text no-underline">
            {c.name}
          </a>
          <span className="max-w-56 truncate text-xs text-text-muted">{c.email}</span>
        </div>
      </div>
    ),
  },
  { id: "company", header: "Company", cell: (c) => <span className="text-text-secondary">{c.company}</span> },
  { id: "services", header: "Services", align: "right", cellClassName: "font-bold tabular-nums", cell: (c) => c.services },
  { id: "domains", header: "Domains", align: "right", cellClassName: "font-bold tabular-nums", cell: (c) => c.domains },
  {
    id: "due",
    header: "Balance due",
    align: "right",
    cellClassName: "font-bold tabular-nums whitespace-nowrap",
    cell: (c) => <DueAmount client={c} />,
  },
  { id: "group", header: "Group", cell: (c) => <GroupTag>{c.group}</GroupTag> },
  { id: "status", header: "Status", cell: (c) => <StatusPill tone={STATUS[c.status].tone}>{STATUS[c.status].label}</StatusPill> },
  { id: "joined", header: "Joined", cellClassName: "whitespace-nowrap text-text-muted", cell: (c) => c.joined },
  { id: "actions", header: "Actions", srOnlyHeader: true, cell: (c) => <ClientActions client={c} /> },
];

function ClientMobileRow({ client }: { client: Client }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <Avatar name={client.name} />
        <div className="flex min-w-0 flex-1 flex-col">
          <a href="#" className="-my-3 block truncate py-3 font-bold text-text no-underline">
            {client.name}
          </a>
          <span className="truncate text-xs text-text-muted">{client.email}</span>
        </div>
        <StatusPill tone={STATUS[client.status].tone}>{STATUS[client.status].label}</StatusPill>
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
            <DueAmount client={client} />
          </dd>
        </div>
      </dl>
      <div className="flex min-w-0 items-center gap-2 text-xs text-text-muted">
        <GroupTag>{client.group}</GroupTag>
        <span className="truncate">
          {client.company !== "—" ? `${client.company} · ` : ""}Joined {client.joined}
        </span>
      </div>
      <ClientActions client={client} stretch />
    </div>
  );
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Users, label: "Clients", current: true },
  { icon: FileText, label: "Orders", badge: 6 },
  { icon: ServerCog, label: "Support tickets", badge: 14 },
];

// ---------- Page ----------

export function UiPreview() {
  const [tab, setTab] = useState<StatusTab>("all");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [page, setPage] = useState(1);
  const [range, setRange] = useState<"today" | "30d" | "year">("30d");
  const [manyTab, setManyTab] = useState("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [agree, setAgree] = useState(true);
  const [rowsChecked, setRowsChecked] = useState([true, false, true]);

  const q = query.trim().toLowerCase();
  const rows = CLIENTS.filter((c) => tab === "all" || c.status === tab)
    .filter((c) => group === "all" || c.group === group)
    .filter((c) => !q || `${c.name} ${c.email} ${c.company}`.toLowerCase().includes(q));

  const allChecked = rowsChecked.every(Boolean);
  const someChecked = rowsChecked.some(Boolean);

  function fakeSave() {
    setSaving(true);
    window.setTimeout(() => setSaving(false), 2000);
  }

  function clearFilters() {
    setTab("all");
    setGroup("all");
    setQuery("");
  }

  return (
    <main className="mx-auto flex w-full max-w-[1360px] flex-col gap-10 px-4 py-4 md:px-6 md:py-6 xl:px-8 xl:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-bold tracking-[0.14em] text-text-muted uppercase">Temporary</span>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-[28px] xl:text-[30px]">UI preview</h1>
          <p className="text-[15px] text-text-muted">Every component in components/ui, in every state. Check at 360px and 1440px.</p>
        </div>
        <SegmentedControl
          aria-label="Date range"
          track="page"
          value={range}
          onValueChange={setRange}
          items={[
            { value: "today", label: "Today" },
            { value: "30d", label: "Last 30 days" },
            { value: "year", label: "This year" },
          ]}
        />
      </header>

      <Section title="Button" note="Variants × sizes (md 44px, sm 40px with a 44px hit area). Icon-only buttons require aria-label.">
        <Card padding="md">
          <div className="grid gap-5 lg:grid-cols-2">
            <Demo label="md">
              <Button leadingIcon={<Plus className="size-4" strokeWidth={2.2} />}>Add client</Button>
              <Button variant="secondary" leadingIcon={<Download className="size-4" />}>
                Export
              </Button>
              <Button variant="danger-outline">Delete role</Button>
              <Button variant="ghost">Cancel</Button>
            </Demo>
            <Demo label="sm">
              <Button size="sm">Primary</Button>
              <Button size="sm" variant="secondary">
                Secondary
              </Button>
              <Button size="sm" variant="danger-outline">
                Danger
              </Button>
              <Button size="sm" variant="ghost">
                Ghost
              </Button>
            </Demo>
            <Demo label="Icon-only (md, sm)">
              <Button iconOnly variant="secondary" aria-label="Notifications">
                <Bell className="size-[18px]" strokeWidth={1.8} />
              </Button>
              <Button iconOnly aria-label="Add">
                <Plus className="size-4" />
              </Button>
              <Button iconOnly variant="danger-outline" aria-label="Delete">
                <Trash2 className="size-4" />
              </Button>
              <Button iconOnly variant="ghost" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
              <Button iconOnly size="sm" variant="secondary" aria-label="Search">
                <Search className="size-4" />
              </Button>
            </Demo>
            <Demo label="Loading (click Save) and disabled">
              <Button loading={saving} onClick={fakeSave}>
                Save changes
              </Button>
              <Button variant="secondary" loading>
                Exporting
              </Button>
              <Button iconOnly variant="secondary" aria-label="Refreshing" loading>
                <Bell className="size-4" />
              </Button>
              <Button disabled>Save changes</Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
              <Button variant="danger-outline" disabled>
                Disabled
              </Button>
            </Demo>
            <Demo label="Link styled as button">
              <a href="#" className={buttonVariants({ variant: "secondary" })}>
                View
              </a>
              <a href="#" className={buttonVariants({ variant: "primary", size: "sm" })}>
                Open report
              </a>
            </Demo>
          </div>
        </Card>
      </Section>

      <Section title="Input, Select, SearchInput" note="16px text on phones (no iOS zoom), 14px from sm. Every control has a real <label>.">
        <Card padding="md">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Input label="Role name" placeholder="e.g. Billing" defaultValue="Support agent" />
            <Input label="Email address" type="email" placeholder="you@everdigitech.com" hint="We'll send the invite here." />
            <Input label="Phone" defaultValue="01711-00000" error="Enter an 11-digit Bangladeshi mobile number." />
            <Input label="Client ID" defaultValue="CL-10482" disabled />
            <Input
              label="Password"
              type="password"
              controlSize="lg"
              placeholder="Your password"
              autoComplete="current-password"
              labelAction={
                <a href="#" className="-my-3 inline-flex min-h-11 items-center text-[13px] font-bold no-underline">
                  Forgot password?
                </a>
              }
            />
            <Input label="Hidden label (sr-only)" hideLabel placeholder="Label is visually hidden" />
            <Select label="Client group" defaultValue="all">
              <option value="all">All groups</option>
              <option>Regular</option>
              <option>Reseller</option>
              <option>VIP</option>
            </Select>
            <Select label="Billing cycle" error="Pick a billing cycle." defaultValue="">
              <option value="" disabled>
                Choose…
              </option>
              <option>Monthly</option>
              <option>Yearly</option>
            </Select>
            <Select label="Disabled select" disabled>
              <option>Monthly</option>
            </Select>
            <SearchInput label="Search clients" placeholder="Name, email or company" />
            <SearchInput variant="muted" shortcut="Ctrl K" placeholder="Search clients, domains, invoices…" />
            <SearchInput label="Search with error" hideLabel={false} defaultValue="%%" error="Search can't contain only symbols." />
          </div>
        </Card>
      </Section>

      <Section title="Checkbox" note="18px box in a 44px tap area, primary accent.">
        <Card padding="md">
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            <Checkbox label="Keep me signed in on this device" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <Checkbox label="Unchecked" />
            <Checkbox
              label={allChecked ? "All rows selected" : someChecked ? "Some rows selected (indeterminate)" : "No rows selected"}
              checked={allChecked}
              indeterminate={someChecked && !allChecked}
              onChange={(e) => setRowsChecked(rowsChecked.map(() => e.target.checked))}
            />
            <Checkbox label="Disabled" disabled />
            <Checkbox label="Disabled, checked" disabled defaultChecked />
            <Checkbox label="I accept the terms" error="You must accept the terms to continue." />
          </div>
          <Demo label="Hidden labels (permission grid)">
            {rowsChecked.map((on, i) => (
              <Checkbox
                key={i}
                hideLabel
                label={`Row ${i + 1}`}
                checked={on}
                onChange={(e) => setRowsChecked(rowsChecked.map((v, j) => (j === i ? e.target.checked : v)))}
              />
            ))}
          </Demo>
        </Card>
      </Section>

      <Section title="Card" note="16px padding on phones; 20px (md) or 24px (lg) from md. Optional header with title + action link.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card padding="md">
            <span className="text-[13px] font-bold text-text-muted">Revenue</span>
            <span className="text-[28px] font-extrabold tracking-tight tabular-nums">৳4,82,350</span>
          </Card>
          <Card padding="md" title="With title" action={<CardLink href="#">Open report</CardLink>}>
            <p className="text-sm text-text-muted">Padding md: 16 → 20px.</p>
          </Card>
          <Card title="With description" description="Paid invoices only, in BDT" action={<CardLink href="#">Manage</CardLink>}>
            <p className="text-sm text-text-muted">Padding lg: 16 → 24px.</p>
          </Card>
          <Card title="A very long card title that should wrap rather than overflow the card" titleAs="h3">
            <p className="truncate text-sm text-text-muted">mahmud.hasan.longaddress@digicraft-agency.example</p>
          </Card>
        </div>
      </Section>

      <Section title="StatusPill and Badge">
        <Card padding="md">
          <Demo label="Tones, with dot">
            <StatusPill tone="success">Active</StatusPill>
            <StatusPill tone="warning">Pending</StatusPill>
            <StatusPill tone="danger">Overdue</StatusPill>
            <StatusPill tone="neutral">Closed</StatusPill>
            <StatusPill tone="info">Provisioning</StatusPill>
          </Demo>
          <Demo label="Without dot">
            <StatusPill tone="success" dot={false}>
              Healthy
            </StatusPill>
            <StatusPill tone="warning" dot={false}>
              High load
            </StatusPill>
            <StatusPill tone="danger" dot={false}>
              Down
            </StatusPill>
          </Demo>
          <Demo label="Badge">
            <Badge count={6} />
            <Badge count={14} />
            <Badge count={128} />
            <Badge count={1500} max={999} />
          </Demo>
        </Card>
      </Section>

      <Section title="Tabs and SegmentedControl" note="On narrow screens the strip scrolls sideways inside itself (no scrollbar), never wrapping. Arrow keys move between items.">
        <Card padding="md">
          <Demo label="Tabs with counts (muted track)" className="flex min-w-0">
            <Tabs aria-label="Client status" value={tab} onValueChange={setTab} items={STATUS_TABS} />
          </Demo>
          <Demo label="Many tabs (scrolls on phones)" className="flex min-w-0">
            <Tabs
              aria-label="Client sections"
              value={manyTab}
              onValueChange={setManyTab}
              items={[
                { value: "overview", label: "Overview" },
                { value: "services", label: "Services", count: 9 },
                { value: "domains", label: "Domains", count: 22 },
                { value: "invoices", label: "Invoices", count: 41 },
                { value: "tickets", label: "Tickets", count: 3 },
                { value: "notes", label: "Notes" },
                { value: "emails", label: "Emails" },
                { value: "log", label: "Activity log" },
                { value: "archived", label: "Archived", disabled: true },
              ]}
            />
          </Demo>
          <Demo label="SegmentedControl (page track, see header)" className="flex min-w-0">
            <SegmentedControl
              aria-label="Date range (copy)"
              value={range}
              onValueChange={setRange}
              items={[
                { value: "today", label: "Today" },
                { value: "30d", label: "Last 30 days" },
                { value: "year", label: "This year" },
              ]}
            />
          </Demo>
        </Card>
      </Section>

      <Section title="Avatar and EmptyState">
        <div className="grid gap-4 md:grid-cols-3">
          <Card padding="md">
            <Demo label="Sizes 40 and 36">
              <Avatar name="Nayemul Zannat" />
              <Avatar name="Rahim Uddin" size={36} />
              <Avatar name="Arif" decorative={false} />
            </Demo>
            <div className="flex min-w-0 items-center gap-2.5 rounded-control border border-border bg-primary-hover-soft p-3">
              <Avatar name="Nayemul Zannat" size={36} />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-bold">Nayemul Zannat</span>
                <span className="text-xs text-text-muted">Super Admin</span>
              </div>
            </div>
          </Card>
          <Card padding="none">
            <EmptyState title="No clients match this filter" text="Try another status or clear the search." />
          </Card>
          <Card padding="none">
            <EmptyState
              icon={<Users />}
              title="No staff yet"
              text="Invite your team so they can manage clients and tickets."
              action={<Button leadingIcon={<Plus className="size-4" />}>Invite staff</Button>}
            />
          </Card>
        </div>
      </Section>

      <Section title="Pagination" note="Phones: Previous · Page X of Y · Next. From md: page numbers.">
        <Card padding="md">
          <Demo label={`Interactive (page ${page} of 24)`}>
            <Pagination page={page} pageCount={24} onPageChange={setPage} />
          </Demo>
          <Demo label="First page / last page / few pages">
            <Pagination page={1} pageCount={3} onPageChange={() => {}} />
            <Pagination page={12} pageCount={12} onPageChange={() => {}} />
            <Pagination page={1} pageCount={1} onPageChange={() => {}} />
          </Demo>
        </Card>
      </Section>

      <Section
        title="ResponsiveTable"
        note="Real <table> from md (scrolls sideways inside its wrapper if narrower than 1000px); stacked cards below md. Try the filters to reach the empty state."
      >
        <Card padding="none">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:px-5 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              aria-label="Client status"
              value={tab}
              onValueChange={(v) => {
                setTab(v);
                setPage(1);
              }}
              items={STATUS_TABS.map((t) => ({ ...t, panelId: "clients-table" }))}
            />
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <Select label="Client group" hideLabel value={group} onChange={(e) => setGroup(e.target.value)} className="sm:w-44">
                <option value="all">All groups</option>
                <option>Regular</option>
                <option>Reseller</option>
                <option>VIP</option>
              </Select>
              <SearchInput
                label="Search clients"
                placeholder="Name, email or company"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="sm:w-[300px]"
              />
            </div>
          </div>
          <ResponsiveTable
            id="clients-table"
            caption="Clients"
            columns={clientColumns}
            rows={rows}
            getRowKey={(c) => c.id}
            renderMobileRow={(c) => <ClientMobileRow client={c} />}
            minWidth={1000}
            empty={
              <EmptyState
                title="No clients match this filter"
                text="Try another status or clear the search."
                action={
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            }
            footer={
              <>
                <span className="text-[13px] text-text-muted">Showing {rows.length ? `1–${rows.length}` : "0"} of 1,248 clients</span>
                <Pagination page={page} pageCount={156} onPageChange={setPage} />
              </>
            }
          />
        </Card>
      </Section>

      <Section title="Drawer and Sheet" note="Focus trap, Esc, overlay tap, scroll lock, focus returns to the trigger, reduced motion.">
        <Card padding="md">
          <Demo label="Open">
            <Button variant="secondary" leadingIcon={<Menu className="size-4" />} onClick={() => setDrawerOpen(true)}>
              Open drawer
            </Button>
            <Button variant="secondary" leadingIcon={<SlidersHorizontal className="size-4" />} onClick={() => setSheetOpen(true)}>
              Open sheet
            </Button>
          </Demo>
        </Card>
      </Section>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="EverDigitech" description="Admin console" closeLabel="Close menu">
        <nav aria-label="Admin" className="-mx-2 flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ icon: Icon, label, badge, current }) => (
            <a
              key={label}
              href="#"
              aria-current={current ? "page" : undefined}
              className={
                "flex min-h-11 items-center gap-3 rounded-nav px-3 text-sm font-semibold no-underline " +
                (current ? "bg-primary-soft text-primary" : "text-text-secondary hover:bg-primary-hover-soft hover:text-primary")
              }
            >
              <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
              <span className="min-w-0 truncate">{label}</span>
              {badge ? <Badge count={badge} className="ml-auto" /> : null}
            </a>
          ))}
        </nav>
      </Drawer>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filter clients"
        description="Narrow the list by group and status."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setSheetOpen(false)}>Apply filters</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Select label="Client group" value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="all">All groups</option>
            <option>Regular</option>
            <option>Reseller</option>
            <option>VIP</option>
          </Select>
          <div className="flex flex-col">
            <Checkbox label="Only clients with a balance due" />
            <Checkbox label="Only overdue" />
          </div>
          <Input label="Joined after" type="date" />
        </div>
      </Sheet>

      <BreakpointChip />
    </main>
  );
}
