"use client";

import { useState } from "react";
import { Plus, Shield } from "lucide-react";
import { Can, useAuth } from "@/components/auth";
import { PageHeader } from "@/components/layout";
import { Alert, Button, Card, Input, Skeleton } from "@/components/ui";
import { useDeleteRole, usePermissions, useRoles, useUpdateRole, type Role } from "@/lib/api/roles";
import { cn } from "@/lib/cn";
import {
  allPermissionKeys,
  samePermissions,
  setModulePermissions,
  togglePermission,
  type PermissionKey,
  type PermissionModule,
} from "@/lib/permissions";
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesWarning } from "@/lib/use-unsaved-changes-warning";
import { NewRoleDialog } from "./_components/new-role-dialog";
import { PermissionAccordion, PermissionTable } from "./_components/permission-matrix";
import { RoleChips, RoleList, RolePickerSkeleton, staffLabel } from "./_components/role-picker";

interface Draft {
  roleId: string;
  name: string;
  description: string;
  granted: readonly PermissionKey[];
}

const toDraft = (role: Role): Draft => ({ roleId: role.id, name: role.name, description: role.description, granted: role.permissions });

const isDirty = (draft: Draft, saved: Draft) =>
  draft.name.trim() !== saved.name.trim() ||
  draft.description.trim() !== saved.description.trim() ||
  !samePermissions(draft.granted, saved.granted);

export function RolesView() {
  const rolesQuery = useRoles();
  const permissionsQuery = usePermissions();
  const roles = rolesQuery.data;
  const modules = permissionsQuery.data;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Draft | null>(null);
  const [newRoleOpen, setNewRoleOpen] = useState(false);

  // Default to the first editable role, as the design opens on an editable one rather than Super Admin.
  const role = roles?.find((r) => r.id === selectedId) ?? roles?.find((r) => !r.locked) ?? roles?.[0];
  const saved = role ? toDraft(role) : null;
  const draft = saved && edit?.roleId === saved.roleId ? edit : saved;
  const dirty = Boolean(draft && saved && !role?.locked && isDirty(draft, saved));

  useUnsavedChangesWarning(dirty);

  /** Runs `action` now, or after confirming that unsaved edits can be thrown away. */
  function withDiscardCheck(action: () => void) {
    if (dirty && !window.confirm(UNSAVED_CHANGES_MESSAGE)) return;
    setEdit(null);
    action();
  }

  const header = (
    <PageHeader
      eyebrow="Administration"
      title="Roles & permissions"
      description="Decide what each staff role can see and change in the admin console."
      actions={
        <Can permission="roles.create">
          <Button
            variant="secondary"
            leadingIcon={<Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />}
            onClick={() => withDiscardCheck(() => setNewRoleOpen(true))}
            className="max-sm:w-full"
            disabled={!roles}
          >
            New role
          </Button>
        </Can>
      }
    />
  );

  if (rolesQuery.isError || permissionsQuery.isError) {
    return (
      <div className="flex flex-col gap-4 md:gap-6">
        {header}
        <Alert tone="danger" role="alert" title="Roles couldn't be loaded">
          <div className="flex flex-col items-start gap-3">
            <span>Check your connection and try again.</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void rolesQuery.refetch();
                void permissionsQuery.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {header}

      {!roles || !modules || !role || !draft || !saved ? (
        <div role="status" aria-label="Loading roles" className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <RolePickerSkeleton />
          <EditorSkeleton />
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <RoleList
            roles={roles}
            selectedId={role.id}
            selectedCount={draft.granted.length}
            onSelect={(id) => id !== role.id && withDiscardCheck(() => setSelectedId(id))}
          />
          <RoleChips roles={roles} selectedId={role.id} onSelect={(id) => id !== role.id && withDiscardCheck(() => setSelectedId(id))} />
          <RoleEditor
            key={role.id}
            role={role}
            modules={modules}
            draft={draft}
            dirty={dirty}
            onChange={setEdit}
            onSaved={() => setEdit(null)}
            onDeleted={() => {
              setEdit(null);
              setSelectedId(null);
            }}
          />
        </div>
      )}

      <NewRoleDialog
        open={newRoleOpen}
        onClose={() => setNewRoleOpen(false)}
        onCreated={(created) => {
          setNewRoleOpen(false);
          setEdit(null);
          setSelectedId(created.id);
        }}
      />
    </div>
  );
}

interface RoleEditorProps {
  role: Role;
  modules: PermissionModule[];
  draft: Draft;
  dirty: boolean;
  onChange: (draft: Draft) => void;
  /** The draft now matches what's saved; drop the local edit. */
  onSaved: () => void;
  onDeleted: () => void;
}

function RoleEditor({ role, modules, draft, dirty, onChange, onSaved, onDeleted }: RoleEditorProps) {
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const [nameError, setNameError] = useState<string | null>(null);
  const { can } = useAuth();

  const locked = role.locked;
  // Without roles.edit the role can be looked at but not changed; locked roles can't be changed by anyone.
  const canEdit = !locked && can("roles.edit");
  const canDelete = !locked && can("roles.delete");
  const readOnly = !canEdit;
  const total = allPermissionKeys(modules).length;
  const state = { modules, granted: draft.granted, locked: readOnly };

  function save() {
    if (!draft.name.trim()) {
      setNameError("Give the role a name.");
      return;
    }
    updateRole.mutate(
      { id: role.id, data: { name: draft.name, description: draft.description, permissions: [...draft.granted] } },
      { onSuccess: onSaved },
    );
  }

  function remove() {
    const who = role.staffCount ? ` ${staffLabel(role.staffCount)} will lose this role's access.` : "";
    if (!window.confirm(`Delete the ${role.name} role?${who}`)) return;
    deleteRole.mutate(role.id, { onSuccess: onDeleted });
  }

  const summary = (
    <span className="text-[13px] text-text-muted">
      <strong className="text-text tabular-nums">{draft.granted.length}</strong> of {total} permissions selected ·{" "}
      <span>Used by {staffLabel(role.staffCount)}</span>
    </span>
  );

  const actions = (
    <div className="flex gap-2.5">
      {canDelete ? (
        <Button variant="danger-outline" loading={deleteRole.isPending} onClick={remove}>
          Delete role
        </Button>
      ) : null}
      {locked || canEdit ? (
        <Button disabled={!canEdit || !dirty} loading={updateRole.isPending} onClick={save}>
          Save changes
        </Button>
      ) : null}
    </div>
  );

  const error = updateRole.error ?? deleteRole.error;

  return (
    <>
      <Card padding="none" aria-label={`Edit ${role.name}`}>
        <div className="flex flex-col gap-[18px] border-b border-border p-4 md:p-6">
          {locked ? (
            <Alert tone="info" icon={<Shield aria-hidden="true" strokeWidth={2} />}>
              Super Admin always has every permission. This role can&apos;t be edited or deleted, so there is always someone
              who can manage staff.
            </Alert>
          ) : !canEdit ? (
            <Alert tone="info">Your role can view roles but not change them.</Alert>
          ) : null}
          {error ? (
            <Alert tone="danger" role="alert">
              {error.message}
            </Alert>
          ) : null}
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <Input
              label="Role name"
              value={draft.name}
              readOnly={readOnly}
              error={nameError}
              onChange={(e) => {
                setNameError(null);
                onChange({ ...draft, name: e.target.value });
              }}
            />
            <Input
              label="Description"
              value={draft.description}
              readOnly={readOnly}
              onChange={(e) => onChange({ ...draft, description: e.target.value })}
            />
          </div>
        </div>

        <PermissionTable
          modules={modules}
          granted={draft.granted}
          locked={readOnly}
          onToggle={(key) => onChange({ ...draft, granted: togglePermission(state, key).granted })}
          onSetModule={(moduleKey, on) => onChange({ ...draft, granted: setModulePermissions(state, moduleKey, on).granted })}
        />
        <PermissionAccordion
          modules={modules}
          granted={draft.granted}
          locked={readOnly}
          onToggle={(key) => onChange({ ...draft, granted: togglePermission(state, key).granted })}
          onSetModule={(moduleKey, on) => onChange({ ...draft, granted: setModulePermissions(state, moduleKey, on).granted })}
        />

        {/* md+: always at the bottom of the card. Phones: shown here only while there are no unsaved changes. */}
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-muted px-4 py-4 md:flex md:px-6",
            dirty && "max-md:hidden",
          )}
        >
          {summary}
          <div className="max-md:hidden">{actions}</div>
          {canDelete ? (
            <Button variant="danger-outline" loading={deleteRole.isPending} onClick={remove} className="md:hidden">
              Delete role
            </Button>
          ) : null}
        </div>
      </Card>

      {/* Phones: sticky action bar while there are unsaved changes, clear of the home indicator. */}
      {dirty ? (
        <>
          <div aria-hidden="true" className="h-28 md:hidden" />
          <div
            role="region"
            aria-label="Unsaved changes"
            className="fixed inset-x-0 bottom-0 z-20 flex flex-col gap-2.5 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgb(16_24_40/0.08)] md:hidden"
          >
            {summary}
            <div className="flex gap-2.5 [&>*]:flex-1">
              {canDelete ? (
                <Button variant="danger-outline" loading={deleteRole.isPending} onClick={remove}>
                  Delete role
                </Button>
              ) : null}
              <Button loading={updateRole.isPending} onClick={save}>
                Save changes
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

function EditorSkeleton() {
  return (
    <Card padding="none">
      <div className="grid gap-4 border-b border-border p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-11 rounded-control" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-11 rounded-control" />
        </div>
      </div>
      <div className="flex flex-col gap-2.5 p-4 md:gap-0 md:p-0">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-control border border-border p-4 md:rounded-none md:border-0 md:border-t md:border-divider md:px-6 md:first:border-t-0">
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48 max-w-full" />
            </div>
            <Skeleton className="size-[18px] max-md:hidden" />
            <Skeleton className="size-[18px] max-md:hidden" />
            <Skeleton className="size-[18px] max-md:hidden" />
            <Skeleton className="size-[18px] max-md:hidden" />
            <Skeleton className="h-4 w-12 md:w-28" />
          </div>
        ))}
      </div>
    </Card>
  );
}
