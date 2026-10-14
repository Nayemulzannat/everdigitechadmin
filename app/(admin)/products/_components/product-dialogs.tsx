"use client";

import { useRef, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Alert, Button, Checkbox, Dialog, Input, Select, Skeleton, controlClasses } from "@/components/ui";
import { toApiError } from "@/lib/api/errors";
import {
  formatPaisa,
  paisaToTaka,
  previewTax,
  takaToPaisa,
  useCreateProduct,
  useDeleteProduct,
  useProductOptions,
  useUpdateProduct,
  type BillingCycle,
  type FeatureGroup,
  type Product,
  type ProductOptions,
} from "@/lib/api/products";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";

const FORM_ID = "product-form";

/** Add (no product) or edit (with one). Mounted only while open, and only once the options are there, so the fields start fresh. */
export type ProductFormMode = { type: "create"; groupId?: string } | { type: "edit"; product: Product };

/** One billing cycle of the form. `manual`: the price is typed; otherwise it is worked out from the monthly price and `pct`. */
interface PriceRow {
  sold: boolean;
  manual: boolean;
  /** Discount percent, as typed. */
  pct: string;
  price: string;
  regular: string;
}

type Resolved = { amount: number; compare: number | null } | { error: string; field: (cycle: string) => string };

/** The monthly regular price the product was saved with, in taka: the monthly price before its discount. */
function initialBase(product: Product | null): string {
  const monthly = product?.prices.find((p) => p.cycle === "monthly");

  return monthly ? paisaToTaka(monthly.compareAmount ?? monthly.amount) : "";
}

function initialRows(cycles: ProductOptions["cycles"], product: Product | null, base: string): Record<string, PriceRow> {
  const basePaisa = takaToPaisa(base);

  return Object.fromEntries(
    cycles.map((cycle) => {
      const saved = product?.prices.find((p) => p.cycle === cycle.value);
      const blank: PriceRow = { sold: !product && cycle.value === "monthly", manual: false, pct: "", price: "", regular: "" };
      if (!saved) return [cycle.value, blank];

      // Was it worked out from the monthly price? (regular = monthly x months, and the price follows from the discount.)
      const regular = saved.compareAmount ?? saved.amount;
      const pct = Math.round((1 - saved.amount / regular) * 10000) / 100;
      const fits = cycle.months !== null && basePaisa !== null && regular === basePaisa * cycle.months && Math.round(regular * (1 - pct / 100)) === saved.amount;

      return [
        cycle.value,
        fits
          ? { sold: true, manual: false, pct: pct > 0 ? String(pct) : "", price: "", regular: "" }
          : { sold: true, manual: true, pct: "", price: paisaToTaka(saved.amount), regular: saved.compareAmount ? paisaToTaka(saved.compareAmount) : "" },
      ];
    }),
  );
}

/** The price to save for a cycle: from the monthly price and the discount, or as typed. */
function resolveRow(row: PriceRow, months: number | null, base: string): Resolved {
  if (months !== null && !row.manual) {
    const monthly = takaToPaisa(base);
    if (monthly === null || monthly === 0) return { error: "Enter the monthly price above first.", field: () => "base.price" };

    const pctText = row.pct.trim();
    const pct = pctText === "" ? 0 : /^\d+(\.\d{1,2})?$/.test(pctText) ? Number(pctText) : NaN;
    if (Number.isNaN(pct) || pct >= 100) return { error: "Use a percent from 0 to 99, like 20.", field: (cycle) => `pct.${cycle}` };

    const regular = monthly * months;
    const amount = Math.round(regular * (1 - pct / 100));
    if (amount < 1) return { error: "The price would be zero.", field: (cycle) => `pct.${cycle}` };

    return { amount, compare: pct > 0 ? regular : null };
  }

  const amount = takaToPaisa(row.price);
  if (amount === null || amount === 0) return { error: "Use an amount like 899 or 899.50.", field: (cycle) => `price.${cycle}` };
  const regular = row.regular.trim() === "" ? null : takaToPaisa(row.regular);
  if (row.regular.trim() !== "" && (regular === null || regular <= amount)) return { error: "Must be higher than the real price, or leave it empty.", field: (cycle) => `compare.${cycle}` };

  return { amount, compare: regular };
}

export function ProductFormDialog({ mode, onClose }: { mode: ProductFormMode | null; onClose: () => void }) {
  const options = useProductOptions();

  if (!mode) return null;

  if (!options.data) {
    return (
      <Dialog open onClose={onClose} size="xl" title={mode.type === "edit" ? `Edit ${mode.product.name}` : "Add a product"}>
        {options.isError ? (
          <Alert tone="danger" role="alert">
            The form could not be loaded. Close this and try again.
          </Alert>
        ) : (
          <div role="status" aria-label="Loading" className="flex flex-col gap-3">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}
      </Dialog>
    );
  }

  return <OpenForm key={mode.type === "edit" ? mode.product.id : "new"} mode={mode} options={options.data} onClose={onClose} />;
}

function OpenForm({ mode, options, onClose }: { mode: ProductFormMode; options: ProductOptions; onClose: () => void }) {
  const product = mode.type === "edit" ? mode.product : null;
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const [groupId, setGroupId] = useState(product?.groupId ?? (mode.type === "create" ? mode.groupId : undefined) ?? options.groups[0]?.id ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [tagline, setTagline] = useState(product?.tagline ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [features, setFeatures] = useState((product?.features ?? []).join("\n"));
  // Sections of the comparison on the pricing page. Each is a title and one line per item (kept as text while editing).
  const [sections, setSections] = useState<{ title: string; text: string }[]>(() => (product?.featureGroups ?? []).map((g) => ({ title: g.title, text: g.items.join("\n") })));
  const [setupFee, setSetupFee] = useState(product && product.setupFee > 0 ? paisaToTaka(product.setupFee) : "");
  // Prices. The person types the MONTHLY price once; every other cycle is worked out from it (price x months) and gets its
  // own discount percent. A cycle can also be set by hand. Money is typed in taka.
  const [base, setBase] = useState(() => initialBase(product));
  const [rows, setRows] = useState<Record<string, PriceRow>>(() => initialRows(options.cycles, product, initialBase(product)));
  const patchRow = (cycle: string, patch: Partial<PriceRow>) => setRows((current) => ({ ...current, [cycle]: { ...current[cycle], ...patch } }));
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [sortOrder, setSortOrder] = useState(product ? String(product.sortOrder) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState("");
  const pending = create.isPending || update.isPending;

  function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setBanner("");
    const found: Record<string, string> = {};

    if (!groupId) found.groupId = "Choose a group. Add one first on the Groups page if there is none.";
    if (!name.trim()) found.name = "Enter the name of the product.";

    const fee = setupFee.trim() === "" ? 0 : takaToPaisa(setupFee);
    if (fee === null) found.setupFee = "Use an amount like 500 or 500.50.";

    const chosen: { cycle: BillingCycle; amount: number; compareAmount: number | null }[] = [];
    for (const cycle of options.cycles) {
      const row = rows[cycle.value];
      if (!row?.sold) continue;
      const result = resolveRow(row, cycle.months, base);
      if ("error" in result) found[result.field(cycle.value)] = result.error;
      else chosen.push({ cycle: cycle.value, amount: result.amount, compareAmount: result.compare });
    }
    if (isActive && chosen.length === 0 && !found.prices && !Object.keys(found).some((k) => /^(price|pct|base)\./.test(k))) {
      found.prices = "Give it at least one price, or switch the product off.";
    }
    if (sortOrder.trim() !== "" && !/^\d+$/.test(sortOrder.trim())) found.sortOrder = "Use a whole number, 0 or more.";
    if (Object.keys(found).length) return setErrors(found);

    const input = {
      groupId,
      name: name.trim(),
      tagline: tagline.trim() || null,
      description: description.trim() || null,
      featureGroups: sections.map((s): FeatureGroup => ({ title: s.title.trim(), items: s.text.split("\n").map((l) => l.trim()).filter(Boolean) })).filter((g) => g.title || g.items.length),
      features: features.split("\n").map((line) => line.trim()).filter(Boolean),
      setupFee: fee ?? 0,
      isActive,
      isFeatured,
      prices: chosen,
      ...(sortOrder.trim() !== "" ? { sortOrder: Number(sortOrder) } : {}),
    };
    const handlers = {
      onSuccess: () => {
        toast({ title: product ? "Product saved" : "Product added", tone: "success" });
        onClose();
      },
      onError: (raw: unknown) => {
        const error = toApiError(raw);
        const fields: Record<string, string> = {};
        for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) {
          // prices.0.amount -> shown under that cycle's box
          const match = /^prices\.(\d+)\./.exec(field);
          const cycle = match ? chosen[Number(match[1])]?.cycle : undefined;
          fields[cycle ? (field.endsWith("compareAmount") ? `compare.${cycle}` : `price.${cycle}`) : field] = messages[0] ?? error.message;
        }
        if (Object.keys(fields).length) setErrors(fields);
        else setBanner(error.message);
      },
    };

    if (product) update.mutate({ id: product.id, input }, handlers);
    else create.mutate(input, handlers);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title={product ? `Edit ${product.name}` : "Add a product"}
      description="What clients can buy, and what it costs."
      initialFocusRef={nameRef}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={pending}>
            {product ? "Save changes" : "Add product"}
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

        <Select label="Group" value={groupId} onChange={(e) => setGroupId(e.target.value)} error={errors.groupId}>
          {options.groups.length === 0 ? <option value="">No groups yet</option> : null}
          {options.groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        <Input ref={nameRef} label="Name" value={name} maxLength={150} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="For example: Turbo Business" />
        <Input label="Short line" value={tagline} maxLength={200} onChange={(e) => setTagline(e.target.value)} error={errors.tagline} hint="Shown under the name. Optional." />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="product-description" className="text-sm font-semibold">
            Description
          </label>
          <textarea id="product-description" value={description} maxLength={5000} rows={3} onChange={(e) => setDescription(e.target.value)} className={cn(controlClasses(false), "resize-y p-3")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="product-features" className="text-sm font-semibold">
            What is included
          </label>
          <textarea
            id="product-features"
            value={features}
            rows={5}
            onChange={(e) => setFeatures(e.target.value)}
            placeholder={"10 GB SSD storage\nFree SSL certificate\nDaily backups"}
            aria-invalid={errors.features ? true : undefined}
            className={cn(controlClasses(Boolean(errors.features)), "resize-y p-3")}
          />
          <p className="text-[13px] text-text-muted">One line for each thing, up to 20.</p>
          {errors.features ? <p className="text-[13px] font-semibold text-danger">{errors.features}</p> : null}
        </div>

        <fieldset className="flex flex-col gap-3 rounded-control border border-border p-4">
          <legend className="px-1 text-sm font-bold">More sections on the pricing page</legend>
          <p className="text-[13px] text-text-muted">Groups of details shown under the plan, for example Primary, Server, Security and Support. One line for each item.</p>
          {sections.map((section, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-control border border-border p-3">
              <div className="flex items-end gap-2">
                <Input
                  label="Section title"
                  value={section.title}
                  maxLength={60}
                  onChange={(e) => setSections(sections.map((s, i) => (i === index ? { ...s, title: e.target.value } : s)))}
                  error={errors[`featureGroups.${index}.title`]}
                  placeholder="Server"
                  className="flex-1"
                />
                <Button iconOnly variant="secondary" aria-label={`Remove section ${section.title || index + 1}`} onClick={() => setSections(sections.filter((_, i) => i !== index))}>
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              </div>
              <textarea
                aria-label={`Items of ${section.title || "section"}`}
                value={section.text}
                rows={4}
                onChange={(e) => setSections(sections.map((s, i) => (i === index ? { ...s, text: e.target.value } : s)))}
                placeholder={"1 Core Hosting CPU\n1 GB Hosting RAM"}
                className={cn(controlClasses(Boolean(errors[`featureGroups.${index}.items`])), "resize-y p-3")}
              />
              {errors[`featureGroups.${index}.items`] ? <p className="text-[13px] font-semibold text-danger">{errors[`featureGroups.${index}.items`]}</p> : null}
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {["Primary", "Server", "Security", "Support"].filter((name) => !sections.some((s) => s.title === name)).map((name) => (
              <Button key={name} variant="secondary" size="sm" onClick={() => setSections([...sections, { title: name, text: "" }])}>
                + {name}
              </Button>
            ))}
            <Button variant="secondary" size="sm" leadingIcon={<Plus aria-hidden="true" className="size-4" />} disabled={sections.length >= 8} onClick={() => setSections([...sections, { title: "", text: "" }])}>
              Other section
            </Button>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3 rounded-control border border-border p-4">
          <legend className="px-1 text-sm font-bold">Prices, in taka</legend>
          <p className="text-[13px] text-text-muted">
            Fill in the cycles this product is sold with and leave the others empty. Each price is for the whole cycle: the yearly price is the price of the year.{" "}
            {options.tax.rate > 0
              ? options.tax.inclusive
                ? `Prices already include ${options.tax.label} (${options.tax.rate}%).`
                : `${options.tax.label} (${options.tax.rate}%) is added on top.`
              : "No tax is added."}
          </p>
          {errors.prices ? (
            <Alert tone="danger" role="alert">
              {errors.prices}
            </Alert>
          ) : null}
          <Input
            label="Monthly price (regular, for one month)"
            inputMode="decimal"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            error={errors["base.price"]}
            hint="The other cycles are worked out from this: for example yearly = 12 months. Then give each cycle its own discount."
            placeholder="For example: 500"
            className="sm:max-w-sm"
          />
          <div className="flex flex-col gap-3">
            {options.cycles.map((cycle) => {
              const row = rows[cycle.value];
              const auto = cycle.months !== null && !row.manual;
              const result = row.sold ? resolveRow(row, cycle.months, base) : null;
              const ok = result && !("error" in result) ? result : null;
              const shown = ok ? previewTax(ok.amount, options.tax) : null;
              const regular = auto && cycle.months ? takaToPaisa(base) : null;

              return (
                <div key={cycle.value} className={cn("flex flex-col gap-3 rounded-control border p-3", row.sold ? "border-border" : "border-dashed border-border")}>
                  <Checkbox label={`Sold ${cycle.label.toLowerCase()}`} checked={row.sold} onChange={(e) => patchRow(cycle.value, { sold: e.target.checked })} />
                  {row.sold ? (
                    auto ? (
                      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1fr_9rem_1fr]">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold">Regular price</span>
                          <span className="flex h-11 items-center text-sm text-text-secondary">{regular !== null && cycle.months ? formatPaisa(regular * cycle.months) : "Enter the monthly price"}</span>
                        </div>
                        <Input label="Discount %" inputMode="decimal" value={row.pct} onChange={(e) => patchRow(cycle.value, { pct: e.target.value })} error={errors[`pct.${cycle.value}`]} placeholder="0" />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold">Client pays</span>
                          <span className="flex h-11 flex-col justify-center text-sm font-extrabold">
                            {ok ? formatPaisa(ok.amount) : "-"}
                            {shown && options.tax.rate > 0 ? <span className="text-[12px] font-normal text-text-muted">{formatPaisa(shown.total)} with {options.tax.label}</span> : null}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          label="Price"
                          inputMode="decimal"
                          value={row.price}
                          onChange={(e) => patchRow(cycle.value, { price: e.target.value })}
                          error={errors[`price.${cycle.value}`]}
                          hint={shown && options.tax.rate > 0 ? `Client pays ${formatPaisa(shown.total)} with ${options.tax.label}` : undefined}
                        />
                        <Input label="Regular price (struck through)" inputMode="decimal" value={row.regular} onChange={(e) => patchRow(cycle.value, { regular: e.target.value })} error={errors[`compare.${cycle.value}`]} placeholder="Optional" />
                      </div>
                    )
                  ) : null}
                  {row.sold && cycle.months !== null ? (
                    <button type="button" className="w-fit text-[13px] font-bold text-primary hover:underline" onClick={() => patchRow(cycle.value, { manual: !row.manual })}>
                      {row.manual ? "Work it out from the monthly price" : "Set this price by hand"}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <Input label="One-time setup fee" inputMode="decimal" value={setupFee} onChange={(e) => setSetupFee(e.target.value)} error={errors.setupFee} hint="Charged once with the first payment. Empty = none." className="sm:max-w-xs" />
        </fieldset>

        <div className="flex flex-col gap-2">
          <Checkbox label="Clients can buy it (shown in the public catalog)" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <Checkbox label="Highlight it as a featured plan" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
        </div>
        <Input label="Position" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} error={errors.sortOrder} hint="Smaller numbers come first. Empty puts it at the end." className="sm:max-w-xs" />
      </form>
    </Dialog>
  );
}

/** Asks before deleting. The product leaves the catalog but stays in the database for old orders. */
export function DeleteProductDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const remove = useDeleteProduct();

  function close() {
    remove.reset();
    onClose();
  }

  return (
    <Dialog
      open={product !== null}
      onClose={close}
      title={`Delete ${product?.name ?? ""}?`}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="danger-outline"
            loading={remove.isPending}
            onClick={() =>
              product &&
              remove.mutate(product.id, {
                onSuccess: () => {
                  toast({ title: "Product deleted", tone: "success" });
                  close();
                },
              })
            }
          >
            Delete product
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
        <p className="text-[15px] text-text-secondary">It will no longer be sold. Orders that already used it are not changed. To stop selling it for now, edit it and switch it off instead.</p>
      </div>
    </Dialog>
  );
}
