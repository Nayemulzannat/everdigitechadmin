"use client";

import { useRef, useState, type FormEvent } from "react";
import { Alert, Button, Checkbox, Dialog, Input, Select, controlClasses } from "@/components/ui";
import { toApiError } from "@/lib/api/errors";
import { useCreateProductGroup, useDeleteProductGroup, useProductOptions, useUpdateProductGroup, type ProductGroup, type ProductType } from "@/lib/api/products";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";

const FORM_ID = "product-group-form";

/** Add (no group) or edit (with one). Mounted only while open, so the fields always start fresh. */
export type GroupFormMode = { type: "create" } | { type: "edit"; group: ProductGroup };

export function GroupFormDialog({ mode, onClose }: { mode: GroupFormMode | null; onClose: () => void }) {
  return mode ? <OpenForm key={mode.type === "edit" ? mode.group.id : "new"} mode={mode} onClose={onClose} /> : null;
}

function OpenForm({ mode, onClose }: { mode: GroupFormMode; onClose: () => void }) {
  const editing = mode.type === "edit";
  const options = useProductOptions();
  const create = useCreateProductGroup();
  const update = useUpdateProductGroup();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(editing ? mode.group.name : "");
  const [type, setType] = useState<ProductType>(editing ? mode.group.type : "hosting");
  const [description, setDescription] = useState(editing ? (mode.group.description ?? "") : "");
  const [sortOrder, setSortOrder] = useState(editing ? String(mode.group.sortOrder) : "");
  const [isActive, setIsActive] = useState(editing ? mode.group.isActive : true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState("");
  const pending = create.isPending || update.isPending;

  function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setBanner("");
    if (!name.trim()) return setErrors({ name: "Enter a name for the group." });
    if (sortOrder.trim() !== "" && !/^\d+$/.test(sortOrder.trim())) return setErrors({ sortOrder: "Use a whole number, 0 or more." });

    const input = {
      name: name.trim(),
      type,
      description: description.trim() || null,
      isActive,
      ...(sortOrder.trim() !== "" ? { sortOrder: Number(sortOrder) } : {}),
    };
    const handlers = {
      onSuccess: () => {
        toast({ title: editing ? "Group saved" : "Group added", tone: "success" });
        onClose();
      },
      onError: (raw: unknown) => {
        const error = toApiError(raw);
        const fields = Object.fromEntries(Object.entries(error.fieldErrors ?? {}).map(([field, messages]) => [field, messages[0] ?? error.message]));
        if (Object.keys(fields).length) setErrors(fields);
        else setBanner(error.message);
      },
    };

    if (mode.type === "edit") update.mutate({ id: mode.group.id, input }, handlers);
    else create.mutate(input, handlers);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? `Edit ${mode.group.name}` : "Add a group"}
      description="A group is a section of the catalog, like Web Hosting or Domains."
      initialFocusRef={nameRef}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={pending}>
            {editing ? "Save changes" : "Add group"}
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
        <Input ref={nameRef} label="Name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="For example: Web Hosting" />
        <Select label="Kind of product" value={type} onChange={(e) => setType(e.target.value as ProductType)} error={errors.type} hint="Later steps use this to decide how an order is set up.">
          {(options.data?.types ?? [{ value: type, label: type }]).map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="group-description" className="text-sm font-semibold">
            Description
          </label>
          <textarea id="group-description" value={description} maxLength={1000} rows={3} onChange={(e) => setDescription(e.target.value)} className={cn(controlClasses(false), "resize-y p-3")} />
        </div>
        <Input label="Position" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} error={errors.sortOrder} hint="Smaller numbers come first. Empty puts it at the end." />
        <Checkbox label="Show it in the public catalog" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
      </form>
    </Dialog>
  );
}

/** Only an empty group can be deleted; the API explains if it is not. */
export function DeleteGroupDialog({ group, onClose }: { group: ProductGroup | null; onClose: () => void }) {
  const remove = useDeleteProductGroup();

  function close() {
    remove.reset();
    onClose();
  }

  return (
    <Dialog
      open={group !== null}
      onClose={close}
      title={`Delete ${group?.name ?? ""}?`}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="danger-outline"
            loading={remove.isPending}
            onClick={() =>
              group &&
              remove.mutate(group.id, {
                onSuccess: () => {
                  toast({ title: "Group deleted", tone: "success" });
                  close();
                },
              })
            }
          >
            Delete group
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
        <p className="text-[15px] text-text-secondary">This cannot be undone. To keep it but hide it from the public catalog, edit it and switch it off instead.</p>
      </div>
    </Dialog>
  );
}
