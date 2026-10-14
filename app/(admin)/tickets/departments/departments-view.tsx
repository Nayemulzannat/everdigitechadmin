"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Can } from "@/components/auth";
import { PageHeader } from "@/components/layout";
import { Alert, Button, Card, EmptyState, Skeleton, StatusPill } from "@/components/ui";
import { toApiError } from "@/lib/api/errors";
import { useReorderTicketDepartments, useTicketDepartments, useUpdateTicketDepartment, type TicketDepartment } from "@/lib/api/ticket-departments";
import { formatCount } from "@/lib/format";
import { toast } from "@/lib/toast";
import { DeleteDepartmentDialog, DepartmentFormDialog, type DepartmentFormMode } from "./department-dialogs";

function DepartmentRow({
  department,
  index,
  total,
  busy,
  onEdit,
  onDelete,
  onMove,
  onToggle,
}: {
  department: TicketDepartment;
  index: number;
  total: number;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onToggle: () => void;
}) {
  const used = department.ticketsCount > 0;

  return (
    <li className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:gap-5 md:px-5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-extrabold">{department.name}</p>
          <StatusPill tone={department.isActive ? "success" : "neutral"}>{department.isActive ? "On" : "Off"}</StatusPill>
        </div>
        {department.description ? <p className="text-sm text-text-muted">{department.description}</p> : null}
        <p className="text-xs text-text-muted">
          {used ? (
            <Link href={`/tickets?department=${department.id}`} className="font-semibold text-primary no-underline hover:underline">
              {formatCount(department.ticketsCount)} {department.ticketsCount === 1 ? "ticket" : "tickets"}
            </Link>
          ) : (
            "No tickets yet"
          )}
        </p>
      </div>

      <Can permission="tickets.edit">
        <div className="flex flex-wrap items-center gap-2">
          <Button iconOnly variant="secondary" size="sm" aria-label={`Move ${department.name} up`} disabled={busy || index === 0} onClick={() => onMove(-1)}>
            <ArrowUp aria-hidden="true" className="size-4" />
          </Button>
          <Button iconOnly variant="secondary" size="sm" aria-label={`Move ${department.name} down`} disabled={busy || index === total - 1} onClick={() => onMove(1)}>
            <ArrowDown aria-hidden="true" className="size-4" />
          </Button>
          <Button variant="secondary" size="sm" disabled={busy} onClick={onToggle}>
            {department.isActive ? "Turn off" : "Turn on"}
          </Button>
          <Button variant="secondary" size="sm" leadingIcon={<Pencil aria-hidden="true" className="size-4" />} onClick={onEdit}>
            Edit
          </Button>
          <Can permission="tickets.delete">
            <Button
              iconOnly
              variant="secondary"
              size="sm"
              aria-label={`Delete ${department.name}`}
              title={used ? "Has tickets: turn it off instead" : "Delete"}
              disabled={busy || used}
              onClick={onDelete}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          </Can>
        </div>
      </Can>
    </li>
  );
}

export function DepartmentsView() {
  const { data, isPending, isError, refetch, isRefetching } = useTicketDepartments();
  const reorder = useReorderTicketDepartments();
  const update = useUpdateTicketDepartment();
  const [form, setForm] = useState<DepartmentFormMode | null>(null);
  const [deleting, setDeleting] = useState<TicketDepartment | null>(null);
  const busy = reorder.isPending || update.isPending;

  const fail = (error: unknown) => toast({ title: "Could not save", description: toApiError(error).message, tone: "danger" });

  function move(index: number, direction: -1 | 1) {
    if (!data) return;
    const ids = data.map((d) => d.id);
    const target = index + direction;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    reorder.mutate(ids, { onError: fail });
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Link href="/tickets" className="inline-flex w-fit items-center gap-1.5 text-sm font-bold text-text-muted no-underline hover:text-primary">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Support tickets
      </Link>

      <PageHeader
        eyebrow="Support"
        title="Departments"
        description="What clients choose from when they open a ticket. The order here is the order they see."
        actions={
          <Can permission="tickets.edit">
            <Button leadingIcon={<Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />} onClick={() => setForm({ type: "create" })}>
              Add department
            </Button>
          </Can>
        }
      />

      <Card padding="none">
        {isError ? (
          <div className="p-4 md:p-5">
            <Alert tone="danger" role="alert" title="Departments couldn't be loaded">
              <div className="flex flex-col items-start gap-3">
                <span>Check your connection and try again.</span>
                <Button variant="secondary" size="sm" loading={isRefetching} onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            </Alert>
          </div>
        ) : isPending ? (
          <div role="status" aria-label="Loading departments" className="flex flex-col">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-5 border-t border-divider px-5 py-4 first:border-t-0">
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-9 w-48" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState title="No departments yet" text="Clients cannot open tickets until there is at least one department." />
        ) : (
          <ul className="divide-y divide-divider">
            {data.map((department, index) => (
              <DepartmentRow
                key={department.id}
                department={department}
                index={index}
                total={data.length}
                busy={busy}
                onEdit={() => setForm({ type: "edit", department })}
                onDelete={() => setDeleting(department)}
                onMove={(direction) => move(index, direction)}
                onToggle={() => update.mutate({ id: department.id, input: { isActive: !department.isActive } }, { onError: fail })}
              />
            ))}
          </ul>
        )}
      </Card>

      <DepartmentFormDialog mode={form} onClose={() => setForm(null)} />
      <DeleteDepartmentDialog department={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
