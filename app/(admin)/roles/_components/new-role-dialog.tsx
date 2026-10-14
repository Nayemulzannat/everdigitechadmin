"use client";

import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, Button, Dialog, Input } from "@/components/ui";
import { useCreateRole, type Role } from "@/lib/api/roles";

const schema = z.object({
  name: z.string().trim().min(1, "Give the role a name.").max(60, "Keep the name under 60 characters."),
  description: z.string().trim().max(200, "Keep the description under 200 characters."),
});

const FORM_ID = "new-role-form";

interface NewRoleDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (role: Role) => void;
}

/** Name + description for a new role. A centred dialog from md, a bottom sheet on phones. */
export function NewRoleDialog({ open, onClose, onCreated }: NewRoleDialogProps) {
  const createRole = useCreateRole();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { name: "", description: "" } });
  const { ref: registerNameRef, ...nameField } = register("name");

  function close() {
    reset();
    createRole.reset();
    onClose();
  }

  const onSubmit = handleSubmit((values) =>
    createRole.mutate(values, {
      onSuccess: (role) => {
        if (!role) return;
        reset();
        onCreated(role);
      },
    }),
  );

  return (
    <Dialog
      open={open}
      onClose={close}
      title="New role"
      description="Start with no permissions, then choose what this role can do."
      initialFocusRef={nameRef}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={createRole.isPending}>
            Create role
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {createRole.isError ? (
          <Alert tone="danger" role="alert">
            {createRole.error.message}
          </Alert>
        ) : null}
        <Input
          label="Role name"
          placeholder="e.g. Reseller support"
          autoComplete="off"
          error={errors.name?.message}
          ref={(el) => {
            registerNameRef(el);
            nameRef.current = el;
          }}
          {...nameField}
        />
        <Input
          label="Description"
          placeholder="What this role is for"
          autoComplete="off"
          error={errors.description?.message}
          {...register("description")}
        />
      </form>
    </Dialog>
  );
}
