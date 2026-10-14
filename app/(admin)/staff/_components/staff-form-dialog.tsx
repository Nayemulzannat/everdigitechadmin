"use client";

import { useRef } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, Button, Dialog, Input, Skeleton } from "@/components/ui";
import { toApiError } from "@/lib/api/errors";
import { useCreateStaff, useStaffRoles, useUpdateStaff, type StaffMember, type StaffRoleOption } from "@/lib/api/staff";
import { cn } from "@/lib/cn";
import { assignableRoles, staffActions, type StaffViewer } from "@/lib/staff-rules";
import { toast } from "@/lib/toast";

const FORM_ID = "staff-form";
const DEFAULT_ROLE = "Support Staff";

// Same limits as the API (StaffRequest): digits, spaces, + ( ) and - only.
const PHONE = /^\+?[0-9 ()-]{6,30}$/;

const schema = z.object({
  name: z.string().trim().min(1, "Enter the person's full name.").max(255, "Keep the name under 255 characters."),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || PHONE.test(v), "Use digits, spaces, + and - only, like +880 1711-223344."),
  email: z.string().trim().min(1, "Enter a work email.").pipe(z.email("Enter a valid email address, like name@everdigitech.com.")),
  role: z.string().min(1, "Choose a role."),
});

type FormValues = z.output<typeof schema>;

/** Create (no `member`) or edit (with `member`). */
export type StaffFormMode = { type: "create" } | { type: "edit"; member: StaffMember };

interface StaffFormDialogProps {
  /** null = closed. */
  mode: StaffFormMode | null;
  viewer: StaffViewer;
  activeSuperAdmins: number;
  onClose: () => void;
}

/** Add or edit a staff member. A centred dialog from md, a bottom sheet on phones. */
export function StaffFormDialog({ mode, viewer, activeSuperAdmins, onClose }: StaffFormDialogProps) {
  const rolesQuery = useStaffRoles();
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const editing = mode?.type === "edit";
  const pending = create.isPending || update.isPending;

  function close() {
    create.reset();
    update.reset();
    onClose();
  }

  return (
    <Dialog
      open={mode !== null}
      onClose={close}
      title={editing ? `Edit ${mode.member.name}` : "Add staff member"}
      description={
        editing ? "Change their name, phone number or role." : "They'll get an email to set their own password. The link works for 48 hours."
      }
      initialFocusRef={nameRef}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={pending} disabled={!rolesQuery.data}>
            {editing ? "Save changes" : "Send invite"}
          </Button>
        </>
      }
    >
      {/* Mounted only while open, and again when the roles arrive, so the defaults are always fresh. */}
      {mode ? (
        <StaffForm
          key={`${mode.type === "edit" ? mode.member.id : "new"}-${rolesQuery.data ? "ready" : "loading"}`}
          mode={mode}
          roles={rolesQuery.data}
          rolesFailed={rolesQuery.isError}
          viewer={viewer}
          activeSuperAdmins={activeSuperAdmins}
          nameRef={nameRef}
          error={create.error ?? update.error}
          onSubmit={(values, setFieldError) => {
            const onError = (raw: unknown) => {
              const error = toApiError(raw);
              let shown = false;
              for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) {
                if (field in schema.shape) {
                  setFieldError(field as FieldPath<FormValues>, messages[0] ?? error.message);
                  shown = true;
                }
              }
              // Field errors are shown on their field; anything else stays in the banner below via `error`.
              if (shown) {
                create.reset();
                update.reset();
              }
            };

            if (mode.type === "create") {
              create.mutate(
                { name: values.name, email: values.email.toLowerCase(), phone: values.phone || null, role: values.role },
                {
                  onSuccess: (created) => {
                    toast({ title: `Invite sent to ${created.email}`, tone: "success" });
                    close();
                  },
                  onError,
                },
              );
            } else {
              update.mutate(
                {
                  id: mode.member.id,
                  data: {
                    name: values.name,
                    phone: values.phone || null,
                    role: values.role,
                    // Invited people are saved as "active": the invite state ends when they set a password.
                    status: mode.member.status === "suspended" ? "suspended" : "active",
                  },
                },
                {
                  onSuccess: (saved) => {
                    toast({ title: `Saved changes to ${saved.name}`, tone: "success" });
                    close();
                  },
                  onError,
                },
              );
            }
          }}
        />
      ) : null}
    </Dialog>
  );
}

interface StaffFormProps {
  mode: StaffFormMode;
  roles: StaffRoleOption[] | undefined;
  rolesFailed: boolean;
  viewer: StaffViewer;
  activeSuperAdmins: number;
  nameRef: React.RefObject<HTMLInputElement | null>;
  /** An API error that isn't about a single field (e.g. "Only a Super Admin can assign the Super Admin role."). */
  error: Error | null;
  onSubmit: (values: FormValues, setFieldError: (field: FieldPath<FormValues>, message: string) => void) => void;
}

function StaffForm({ mode, roles, rolesFailed, viewer, activeSuperAdmins, nameRef, error, onSubmit }: StaffFormProps) {
  const member = mode.type === "edit" ? mode.member : null;
  const options = roles ? assignableRoles(roles, viewer, member?.role) : [];
  const roleRule = member ? staffActions(member, viewer, { activeSuperAdmins }).changeRole : null;
  const roleLocked = roleRule !== null && !roleRule.allowed;
  // A locked role (the last Super Admin) has no alternatives to pick. Only the current one is shown, as a plain
  // radio: a `disabled` radio would drop out of the form values.
  const visibleOptions = roleLocked ? options.filter((o) => o.id === member?.role?.id) : options;

  const defaultRole =
    member?.role?.id ?? options.find((o) => o.name === DEFAULT_ROLE)?.id ?? options.find((o) => !o.isSuperAdmin)?.id ?? options[0]?.id ?? "";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: member?.name ?? "", phone: member?.phone ?? "", email: member?.email ?? "", role: defaultRole },
  });
  const { ref: registerNameRef, ...nameField } = register("name");

  return (
    <form
      id={FORM_ID}
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(values, (field, message) => setError(field, { type: "server", message })))}
      className="flex flex-col gap-4"
    >
      {error ? (
        <Alert tone="danger" role="alert">
          {error.message}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Full name"
          placeholder="e.g. Nadia Chowdhury"
          autoComplete="off"
          error={errors.name?.message}
          ref={(el) => {
            registerNameRef(el);
            nameRef.current = el;
          }}
          {...nameField}
        />
        <Input
          label={
            <>
              Phone <span className="font-medium text-text-muted">(optional)</span>
            </>
          }
          type="tel"
          inputMode="tel"
          placeholder="+880 1XXX-XXXXXX"
          autoComplete="off"
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>

      <Input
        label="Work email"
        type="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="name@everdigitech.com"
        autoComplete="off"
        readOnly={Boolean(member)}
        hint={member ? "The email can't be changed." : undefined}
        error={errors.email?.message}
        {...register("email")}
      />

      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0" aria-describedby={errors.role ? "staff-role-error" : undefined}>
        <legend className="mb-2 text-[13px] font-bold text-text-secondary">Role</legend>

        {rolesFailed ? (
          <Alert tone="danger" role="alert">
            The roles couldn&apos;t be loaded. Close this and try again.
          </Alert>
        ) : !roles ? (
          <div role="status" aria-label="Loading roles" className="flex flex-col gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[68px] rounded-control" />
            ))}
          </div>
        ) : (
          visibleOptions.map((role) => (
            <label
              key={role.id}
              className={cn(
                "flex items-start gap-3 rounded-control border border-border bg-surface px-3.5 py-3 transition-colors",
                "has-checked:border-primary has-checked:bg-primary-hover-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
                "cursor-pointer hover:border-input-border",
              )}
            >
              <input type="radio" value={role.id} className="mt-0.5 size-[18px] shrink-0 accent-primary" {...register("role")} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-bold text-text">{role.name}</span>
                <span className="text-[13px] text-text-muted">{role.description}</span>
              </span>
            </label>
          ))
        )}

        {errors.role ? (
          <p id="staff-role-error" className="text-[13px] font-semibold text-danger">
            {errors.role.message}
          </p>
        ) : null}
        <span className="text-xs text-text-muted">
          {roleLocked && roleRule && !roleRule.allowed ? roleRule.reason : "Only a Super Admin can make someone a Super Admin."}
        </span>
      </fieldset>
    </form>
  );
}
