"use client";

import { useState, type FormEvent } from "react";
import { Alert, Button, Checkbox, Dialog, Input, Skeleton } from "@/components/ui";
import { toApiError } from "@/lib/api/errors";
import { useTaxSettings, useUpdateTaxSettings, type TaxSettings } from "@/lib/api/products";
import { toast } from "@/lib/toast";

const FORM_ID = "tax-form";

/** The tax (VAT) the catalog and, later, invoices are worked out with. Prices entered in the catalog are not changed. */
export function TaxDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tax = useTaxSettings(open);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tax (VAT)"
      description="Shown on the catalog and added to what clients pay."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={!tax.data}>
            Save tax
          </Button>
        </>
      }
    >
      {tax.data ? (
        <TaxForm initial={tax.data} onDone={onClose} />
      ) : tax.isError ? (
        <Alert tone="danger" role="alert">
          {toApiError(tax.error).message}
        </Alert>
      ) : (
        <div role="status" aria-label="Loading" className="flex flex-col gap-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      )}
    </Dialog>
  );
}

function TaxForm({ initial, onDone }: { initial: TaxSettings; onDone: () => void }) {
  const update = useUpdateTaxSettings();
  const [label, setLabel] = useState(initial.label);
  const [rate, setRate] = useState(String(initial.rate));
  const [inclusive, setInclusive] = useState(initial.inclusive);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState("");

  const percent = Number(rate);
  const validRate = rate.trim() !== "" && /^\d+(\.\d{1,2})?$/.test(rate.trim()) && percent >= 0 && percent <= 100;
  // 1,000 taka as an example, so the effect of the choice is clear.
  const example = validRate
    ? inclusive
      ? `A price of \u09F31,000 already contains ${(1000 - 1000 / (1 + percent / 100)).toFixed(2)} of tax.`
      : `A price of \u09F31,000 becomes \u09F3${(1000 + (1000 * percent) / 100).toFixed(2)} with tax.`
    : null;

  function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setBanner("");
    const found: Record<string, string> = {};
    if (!label.trim()) found.label = "Enter a name, like VAT.";
    if (!validRate) found.rate = "Use a percent from 0 to 100, with at most two decimals, like 15 or 7.5.";
    if (Object.keys(found).length) return setErrors(found);

    update.mutate(
      { label: label.trim(), rate: percent, inclusive },
      {
        onSuccess: () => {
          toast({ title: "Tax saved", tone: "success" });
          onDone();
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
    <form id={FORM_ID} onSubmit={submit} noValidate className="flex flex-col gap-4">
      {banner ? (
        <Alert tone="danger" role="alert">
          {banner}
        </Alert>
      ) : null}
      <Input label="Name" value={label} maxLength={20} onChange={(e) => setLabel(e.target.value)} error={errors.label} placeholder="VAT" />
      <Input label="Rate, in percent" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} error={errors.rate} hint="0 means no tax is added." />
      <Checkbox label="Prices I enter already include this tax" checked={inclusive} onChange={(e) => setInclusive(e.target.checked)} />
      {example ? <p className="text-[13px] text-text-muted">{example}</p> : null}
      <p className="text-[13px] text-text-muted">The prices already saved in the catalog do not change. Only the tax worked out from them does.</p>
    </form>
  );
}
