"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CloudDownload, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { Can } from "@/components/auth";
import { PageHeader } from "@/components/layout";
import { Alert, Button, Card, Checkbox, Dialog, EmptyState, Input, Pagination, SearchInput, Skeleton, StatusPill, Tabs } from "@/components/ui";
import {
  useActivatePriced,
  useCreateExtension,
  useDeleteExtension,
  useExtensions,
  usePricingRule,
  useSyncExtensions,
  useUpdateExtension,
  useUpdatePricingRule,
  type DomainExtension,
  type DomainExtensionInput,
  type ExtensionFilter,
} from "@/lib/api/domains";
import { toApiError } from "@/lib/api/errors";
import { formatPaisa, paisaToTaka, takaToPaisa } from "@/lib/api/products";
import { formatCount } from "@/lib/format";
import { toast } from "@/lib/toast";

const FORM_ID = "extension-form";

type Mode = { type: "create" } | { type: "edit"; extension: DomainExtension };

const priceText = (paisa: number | null) => (paisa === null ? "" : paisaToTaka(paisa));
const usd = (cents: number | null) => (cents === null ? "-" : `$${(cents / 100).toFixed(2)}`);

const TABS: { value: ExtensionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "on", label: "On sale" },
  { value: "off", label: "Off" },
  { value: "no_price", label: "No price" },
  { value: "popular", label: "Popular" },
];

export function ExtensionsView() {
  const [status, setStatus] = useState<ExtensionFilter>("all");
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);
  const [deleting, setDeleting] = useState<DomainExtension | null>(null);
  const [ruleOpen, setRuleOpen] = useState(false);
  const { data, isPending, isError, isPlaceholderData, refetch, isRefetching } = useExtensions({ page, status, search });
  const rule = usePricingRule();
  const sync = useSyncExtensions();
  const activate = useActivatePriced();

  useEffect(() => {
    if (draft.trim() === search.trim()) return;
    const timer = window.setTimeout(() => {
      setSearch(draft);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [draft, search]);

  function runSync() {
    sync.mutate(undefined, {
      onSuccess: (r) => toast({ title: "List updated from Dynadot", description: `${formatCount(r.added)} new extensions added (switched off), ${formatCount(r.updated)} updated. ${formatCount(r.total)} in all.`, tone: "success" }),
      onError: (e) => toast({ title: "Could not update the list", description: toApiError(e).message, tone: "danger" }),
    });
  }

  function runActivate() {
    activate.mutate(undefined, {
      onSuccess: (r) => toast({ title: r.activated ? `${formatCount(r.activated)} extensions switched on` : "Nothing to switch on", description: r.activated ? undefined : "Every extension that has a price and no restriction is on already.", tone: r.activated ? "success" : "info" }),
      onError: (e) => toast({ title: "Could not switch them on", description: toApiError(e).message, tone: "danger" }),
    });
  }

  const first = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Link href="/domains" className="inline-flex w-fit items-center gap-1.5 text-sm font-bold text-text-muted no-underline hover:text-primary">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Domains
      </Link>

      <PageHeader
        eyebrow="Business"
        title="Extensions and prices"
        description="The extensions the website sells. Get the whole list from Dynadot, set how a price is worked out, and type a price only where you want your own. Prices are before tax."
        actions={
          <Can permission="domains.edit">
            <Button variant="secondary" leadingIcon={<CloudDownload aria-hidden="true" className="size-4" />} loading={sync.isPending} onClick={runSync}>
              Update list from Dynadot
            </Button>
            <Button variant="secondary" leadingIcon={<Settings2 aria-hidden="true" className="size-4" />} onClick={() => setRuleOpen(true)}>
              Pricing rule
            </Button>
            <Button leadingIcon={<Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />} onClick={() => setMode({ type: "create" })}>
              Add extension
            </Button>
          </Can>
        }
      />

      {rule.data && rule.data.usdRate === null ? (
        <Alert tone="warning" title="Set the pricing rule">
          <div className="flex flex-col items-start gap-2">
            <span>Without a rate (taka per dollar) only the extensions you priced by hand have a price. Set the rule and every extension gets one from Dynadot&apos;s cost.</span>
            <Can permission="domains.edit">
              <Button variant="secondary" size="sm" onClick={() => setRuleOpen(true)}>
                Set the pricing rule
              </Button>
            </Can>
          </div>
        </Alert>
      ) : null}

      <Card padding="none">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:flex-row md:flex-wrap md:items-center md:justify-between md:px-5">
          <Tabs
            aria-label="Extension filter"
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            items={TABS.map((t) => ({ ...t, count: data ? formatCount(data.counts[t.value]) : undefined, panelId: "extensions-list" }))}
          />
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
            <Can permission="domains.edit">
              <Button variant="secondary" size="sm" loading={activate.isPending} onClick={runActivate} title="Switches on every extension that has a price and no registration restriction">
                Turn on all priced
              </Button>
            </Can>
            <form role="search" onSubmit={(e) => e.preventDefault()} className="min-w-0 md:w-[260px]">
              <SearchInput label="Search extensions" placeholder="For example: shop" value={draft} onChange={(e) => setDraft(e.target.value)} enterKeyHint="search" />
            </form>
          </div>
        </div>

        <div id="extensions-list">
          {isError && !data ? (
            <div className="p-4 md:p-5">
              <Alert tone="danger" role="alert" title="Extensions couldn't be loaded">
                <div className="flex flex-col items-start gap-3">
                  <span>Check your connection and try again.</span>
                  <Button variant="secondary" size="sm" loading={isRefetching} onClick={() => refetch()}>
                    Try again
                  </Button>
                </div>
              </Alert>
            </div>
          ) : isPending ? (
            <div role="status" aria-label="Loading extensions" className="flex flex-col">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center gap-5 border-t border-divider px-5 py-4 first:border-t-0">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <EmptyState
              title={search || status !== "all" ? "No extensions match" : "No extensions yet"}
              text={search || status !== "all" ? "Try another filter, or clear the search." : "Click Update list from Dynadot to bring in all the extensions, then set the pricing rule."}
            />
          ) : (
            <ul className={`divide-y divide-divider transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}>
              {data.items.map((e) => (
                <li key={e.id} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:gap-5 md:px-5">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-extrabold">{e.extension}</p>
                      {e.tag ? <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">{e.tag}</span> : null}
                      <StatusPill tone={e.isActive ? "success" : "neutral"}>{e.isActive ? "On sale" : "Off"}</StatusPill>
                      {e.isFeatured ? <span className="text-xs text-text-muted">Shown in search results</span> : null}
                      {e.restrictions ? <StatusPill tone="warning">Restricted</StatusPill> : null}
                    </div>
                    <p className="text-sm text-text-muted">
                      {e.effectiveRegisterPrice === null ? "No price" : `Register ${formatPaisa(e.effectiveRegisterPrice)}${e.priceSource === "auto" ? " (worked out)" : ""}`}
                      {e.effectiveRenewPrice !== null ? ` · Renew ${formatPaisa(e.effectiveRenewPrice)}` : ""}
                      {e.costRegister !== null ? ` · Dynadot charges ${usd(e.costRegister)}` : ""}
                      {e.usage ? ` · ${e.usage}` : ""}
                    </p>
                    {e.restrictions ? <p className="text-xs text-warning">{e.restrictions}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Can permission="domains.edit">
                      <Button variant="secondary" size="sm" leadingIcon={<Pencil aria-hidden="true" className="size-4" />} onClick={() => setMode({ type: "edit", extension: e })}>
                        Edit
                      </Button>
                    </Can>
                    <Can permission="domains.delete">
                      <Button iconOnly variant="secondary" size="sm" aria-label={`Delete ${e.extension}`} onClick={() => setDeleting(e)}>
                        <Trash2 aria-hidden="true" className="size-4" />
                      </Button>
                    </Can>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {data && data.total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 md:px-5">
            <span aria-live="polite" className="text-[13px] text-text-muted">
              Showing {formatCount(first)}-{formatCount(last)} of {formatCount(data.total)}
            </span>
            <Pagination page={data.page} pageCount={data.pageCount} onPageChange={setPage} />
          </div>
        ) : null}
      </Card>

      {mode ? <ExtensionDialog key={mode.type === "edit" ? mode.extension.id : "new"} mode={mode} onClose={() => setMode(null)} /> : null}
      {ruleOpen ? <RuleDialog onClose={() => setRuleOpen(false)} /> : null}
      <DeleteExtensionDialog extension={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function RuleDialog({ onClose }: { onClose: () => void }) {
  const { data } = usePricingRule();

  return (
    <Dialog open onClose={onClose} title="Pricing rule" description="How the price is worked out for every extension you did not price by hand.">
      {data ? <RuleForm initial={data} onClose={onClose} /> : <Skeleton className="h-40 w-full" />}
    </Dialog>
  );
}

function RuleForm({ initial, onClose }: { initial: { usdRate: number | null; marginPercent: number; roundTo: number }; onClose: () => void }) {
  const update = useUpdatePricingRule();
  const [rate, setRate] = useState(initial.usdRate === null ? "" : String(initial.usdRate));
  const [margin, setMargin] = useState(String(initial.marginPercent));
  const [round, setRound] = useState(String(initial.roundTo));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState("");

  const r = Number(rate);
  const m = Number(margin);
  const step = Number(round);
  const valid = rate.trim() !== "" && r > 0 && margin.trim() !== "" && m >= 0 && Number.isInteger(step) && step >= 1;
  // A $10.88 extension as the example.
  const example = valid ? Math.ceil((10.88 * r * (1 + m / 100)) / step) * step : null;

  function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setBanner("");
    if (!valid) return setErrors({ usdRate: "Enter the rate, the margin and a whole number to round to." });

    update.mutate(
      { usdRate: r, marginPercent: m, roundTo: step },
      {
        onSuccess: () => {
          toast({ title: "Pricing rule saved", tone: "success" });
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
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {banner ? (
        <Alert tone="danger" role="alert">
          {banner}
        </Alert>
      ) : null}
      <Input label="Taka for one US dollar" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} error={errors.usdRate} placeholder="For example: 125" />
      <Input label="Your margin, in percent" inputMode="decimal" value={margin} onChange={(e) => setMargin(e.target.value)} error={errors.marginPercent} hint="Added on top of Dynadot's price." />
      <Input label="Round up to a multiple of (taka)" inputMode="numeric" value={round} onChange={(e) => setRound(e.target.value)} error={errors.roundTo} hint="10 gives prices like 1,770 and 1,780." />
      {example !== null ? <p className="text-[13px] text-text-muted">Example: Dynadot charges $10.88, so the client pays ৳{example.toLocaleString("en-US")} (before tax).</p> : null}
      <p className="text-[13px] text-text-muted">A price you type on an extension always wins over this rule.</p>
      <div className="flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={update.isPending}>
          Save rule
        </Button>
      </div>
    </form>
  );
}

function ExtensionDialog({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const current = mode.type === "edit" ? mode.extension : null;
  const create = useCreateExtension();
  const update = useUpdateExtension();
  const [extension, setExtension] = useState(current?.extension ?? "");
  const [tag, setTag] = useState(current?.tag ?? "");
  const [register, setRegister] = useState(priceText(current?.registerPrice ?? null));
  const [renew, setRenew] = useState(priceText(current?.renewPrice ?? null));
  const [transfer, setTransfer] = useState(priceText(current?.transferPrice ?? null));
  const [isFeatured, setIsFeatured] = useState(current?.isFeatured ?? false);
  const [isActive, setIsActive] = useState(current?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState("");

  /** "" -> null (no price of its own); "1,499" or "999.50" -> paisa; anything else -> undefined (an error). */
  const price = (text: string) => (text.trim() === "" ? null : (takaToPaisa(text) ?? undefined));
  const auto = (paisa: number | null | undefined) => (current && current.priceSource === "auto" && paisa ? `Worked out: ${formatPaisa(paisa)}` : "Uses the rule");

  function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setBanner("");
    const found: Record<string, string> = {};
    if (!extension.trim()) found.extension = "Enter an extension, like .com or .com.bd.";
    const values = { registerPrice: price(register), renewPrice: price(renew), transferPrice: price(transfer) };
    for (const [key, value] of Object.entries(values)) if (value === undefined || value === 0) found[key] = "Use an amount like 999 or 999.50, or leave it empty.";
    if (Object.keys(found).length) return setErrors(found);

    const input: DomainExtensionInput = {
      extension: extension.trim(),
      tag: tag.trim() || null,
      registerPrice: values.registerPrice as number | null,
      renewPrice: values.renewPrice as number | null,
      transferPrice: values.transferPrice as number | null,
      isFeatured,
      isActive,
    };
    const handlers = {
      onSuccess: () => {
        toast({ title: current ? "Extension saved" : "Extension added", tone: "success" });
        onClose();
      },
      onError: (raw: unknown) => {
        const error = toApiError(raw);
        const fields: Record<string, string> = {};
        for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) fields[field] = messages[0] ?? error.message;
        if (Object.keys(fields).length) setErrors(fields);
        else setBanner(error.message);
      },
    };

    if (current) update.mutate({ id: current.id, input }, handlers);
    else create.mutate(input, handlers);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={current ? `Edit ${current.extension}` : "Add an extension"}
      description="Prices are for one year, in taka, before tax. Leave a price empty to use the pricing rule."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={create.isPending || update.isPending}>
            {current ? "Save changes" : "Add extension"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate className="flex flex-col gap-4">
        {banner ? (
          <Alert tone="danger" role="alert">
            {banner}
          </Alert>
        ) : null}
        {current?.restrictions ? <Alert tone="warning">{current.restrictions}</Alert> : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Extension" value={extension} maxLength={30} onChange={(e) => setExtension(e.target.value)} error={errors.extension} placeholder=".com" />
          <Input label="Label" value={tag} maxLength={40} onChange={(e) => setTag(e.target.value)} error={errors.tag} placeholder="For example: Popular" hint="Shown next to it in the results. Optional." />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Register" inputMode="decimal" value={register} onChange={(e) => setRegister(e.target.value)} error={errors.registerPrice} placeholder={auto(current?.effectiveRegisterPrice)} hint={current?.costRegister != null ? `Dynadot charges ${usd(current.costRegister)}` : undefined} />
          <Input label="Renew" inputMode="decimal" value={renew} onChange={(e) => setRenew(e.target.value)} error={errors.renewPrice} placeholder={auto(current?.effectiveRenewPrice)} hint={current?.costRenew != null ? `Dynadot charges ${usd(current.costRenew)}` : undefined} />
          <Input label="Transfer" inputMode="decimal" value={transfer} onChange={(e) => setTransfer(e.target.value)} error={errors.transferPrice} placeholder={auto(current?.effectiveTransferPrice)} hint={current?.costTransfer != null ? `Dynadot charges ${usd(current.costTransfer)}` : undefined} />
        </div>
        <div className="flex flex-col gap-2">
          <Checkbox label="On sale (the website searches it and shows it)" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <Checkbox label="Show it in the search results (otherwise only under More Extensions)" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
        </div>
      </form>
    </Dialog>
  );
}

function DeleteExtensionDialog({ extension, onClose }: { extension: DomainExtension | null; onClose: () => void }) {
  const remove = useDeleteExtension();

  function close() {
    remove.reset();
    onClose();
  }

  return (
    <Dialog
      open={extension !== null}
      onClose={close}
      title={`Delete ${extension?.extension ?? ""}?`}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="danger-outline"
            loading={remove.isPending}
            onClick={() =>
              extension &&
              remove.mutate(extension.id, {
                onSuccess: () => {
                  toast({ title: "Extension deleted", tone: "success" });
                  close();
                },
              })
            }
          >
            Delete extension
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
        <p className="text-[15px] text-text-secondary">The website will no longer sell it. Domains clients already own are not changed. To stop selling it for now, edit it and switch it off instead. (Updating the list from Dynadot brings it back, switched off.)</p>
      </div>
    </Dialog>
  );
}
