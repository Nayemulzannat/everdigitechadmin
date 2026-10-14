"use client";

import { useRef, useState, type FormEvent } from "react";
import { Alert, Button, Checkbox, Dialog, Input } from "@/components/ui";
import { toApiError } from "@/lib/api/errors";
import { useCreateTicketDepartment, useDeleteTicketDepartment, useUpdateTicketDepartment, type TicketDepartment } from "@/lib/api/ticket-departments";
import { toast } from "@/lib/toast";

const FORM_ID = "department-form";

/** Add (no `department`) or edit (with one). Mounted only while open, so the fields always start fresh. */
export type DepartmentFormMode = { type: "create" } | { type: "edit"; department: TicketDepartment };

export function DepartmentFormDialog({ mode, onClose }: { mode: DepartmentFormMode | null; onClose: () => void }) {
  return mode ? <OpenForm key={mode.type === "edit" ? mode.department.id : "new"} mode={mode} onClose={onClose} /> : null;
}

function OpenForm({ mode, onClose }: { mode: DepartmentFormMode; onClose: () => void }) {
  const editing = mode.type === "edit";
  const create = useCreateTicketDepartment();
  const update = useUpdateTicketDepartment();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(editing ? mode.department.name : "");
  const [description, setDescription] = useState(editing ? (mode.department.description ?? "") : "");
  const [isActive, setIsActive] = useState(editing ? mode.department.isActive : true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState("");
  const pending = create.isPending || update.isPending;

  function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setBanner("");
    if (!name.trim()) return setErrors({ name: "Enter a name for the department." });

    const input = { name: name.trim(), description: description.trim() || null, isActive };
    const options = {
      onSuccess: () => {
        toast({ title: editing ? "Department saved" : "Department added", tone: "success" });
        onClose();
      },
      onError: (raw: unknown) => {
        const error = toApiError(raw);
        const fields = Object.fromEntries(Object.entries(error.fieldErrors ?? {}).map(([field, messages]) => [field, messages[0] ?? error.message]));
        if (Object.keys(fields).length) setErrors(fields);
        else setBanner(error.message); // for example: last_active_department
      },
    };

    if (mode.type === "edit") update.mutate({ id: mode.department.id, input }, options);
    else create.mutate(input, options);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? `Edit ${mode.department.name}` : "Add department"}
      description="Clients choose a department when they open a ticket."
      initialFocusRef={nameRef}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={pending}>
            {editing ? "Save changes" : "Add department"}
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
        <Input ref={nameRef} label="Name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="For example: Technical Support" />
        <Input label="Description" value={description} maxLength={255} onChange={(e) => setDescription(e.target.value)} error={errors.description} hint="Shown to the client under the name. Optional." />
        <Checkbox label="Clients can choose this department" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
      </form>
    </Dialog>
  );
}

/** Asks before deleting. Only a department no ticket uses can be deleted; the API explains if not. */
export function DeleteDepartmentDialog({ department, onClose }: { department: TicketDepartment | null; onClose: () => void }) {
  const remove = useDeleteTicketDepartment();

  function close() {
    remove.reset();
    onClose();
  }

  return (
    <Dialog
      open={department !== null}
      onClose={close}
      title={`Delete ${department?.name ?? ""}?`}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="danger-outline"
            loading={remove.isPending}
            onClick={() => department && remove.mutate(department.id, { onSuccess: () => { toast({ title: "Department deleted", tone: "success" }); close(); } })}
          >
            Delete department
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
        <p className="text-[15px] text-text-secondary">This cannot be undone. To stop clients choosing it but keep its tickets, switch it off instead.</p>
      </div>
    </Dialog>
  );
}
