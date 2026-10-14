"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Paperclip, X } from "lucide-react";
import { Can } from "@/components/auth";
import { PageHeader } from "@/components/layout";
import { Alert, Button, Card, Checkbox, Select, Skeleton, controlClasses } from "@/components/ui";
import { useAuth } from "@/components/providers/auth-provider";
import { fillPlaceholders, useCannedReplies } from "@/lib/api/canned-replies";
import { toApiError } from "@/lib/api/errors";
import {
  ATTACHMENT_LIMITS,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  ticketAttachmentUrl,
  useAssignTicket,
  useReplyToTicket,
  useTicket,
  useTicketOptions,
  useUpdateTicket,
  type TicketPriority,
  type TicketReply,
  type TicketStatus,
  type TicketThread,
} from "@/lib/api/tickets";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";
import { TicketStatusPill, formatFileSize, whenLabel } from "../_components/parts";

function Message({ ticketId, reply }: { ticketId: string; reply: TicketReply }) {
  const staff = reply.authorType === "staff";

  return (
    <li
      className={cn(
        "rounded-control border p-4 md:p-5",
        reply.isInternal ? "border-warning/30 bg-warning-soft" : staff ? "border-primary/20 bg-primary-soft" : "border-border bg-surface",
      )}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-extrabold">
          {reply.authorName}
          <span className="ml-2 align-middle text-[11px] font-bold text-text-muted">{reply.isInternal ? "Internal note · only staff see this" : staff ? "Staff" : "Client"}</span>
        </p>
        <p suppressHydrationWarning className="text-xs text-text-muted">
          {whenLabel(reply.createdAt)}
        </p>
      </div>
      {/* Plain text: React escapes it, whitespace-pre-wrap keeps the line breaks. */}
      <p className="text-sm break-words whitespace-pre-wrap">{reply.body}</p>
      {reply.attachments.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {reply.attachments.map((file) => (
            <li key={file.id}>
              <a
                href={ticketAttachmentUrl(ticketId, file.id)}
                className="inline-flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-1.5 text-xs font-semibold no-underline hover:border-primary"
              >
                <Download aria-hidden="true" className="size-3.5" />
                <span className="max-w-[200px] truncate">{file.name}</span>
                <span className="text-text-muted">{formatFileSize(file.size)}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function ReplyForm({ ticket }: { ticket: TicketThread }) {
  const reply = useReplyToTicket(ticket.id);
  const { user } = useAuth();
  const saved = useCannedReplies();
  const picker = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [internal, setInternal] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");

  function choose(e: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? []);
    e.target.value = "";
    const next = [...files];
    for (const file of chosen) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!(ATTACHMENT_LIMITS.extensions as readonly string[]).includes(extension)) return setError(`"${file.name}" is not allowed. Use ${ATTACHMENT_LIMITS.extensions.join(", ")}.`);
      if (file.size > ATTACHMENT_LIMITS.bytes) return setError(`"${file.name}" is over 5 MB.`);
      if (next.length >= ATTACHMENT_LIMITS.files) return setError(`You can attach up to ${ATTACHMENT_LIMITS.files} files.`);
      next.push(file);
    }
    setError("");
    setFiles(next);
  }

  /** Puts a saved reply into the box (after what is already there), with the names filled in. The staff member can still edit it. */
  function insertSaved(id: string) {
    const chosen = saved.data?.find((r) => r.id === id);
    if (!chosen) return;
    const text = fillPlaceholders(chosen.body, {
      clientName: ticket.client.openedBy?.name ?? "there",
      ticketNumber: ticket.number,
      staffName: user?.name ?? "",
    });
    setMessage((current) => (current.trim() ? `${current.trimEnd()}\n\n${text}` : text));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    reply.mutate(
      { message, internal, files },
      {
        onSuccess: () => {
          toast({ title: internal ? "Note added" : "Reply sent", description: internal ? undefined : "The client was emailed.", tone: "success" });
          setMessage("");
          setFiles([]);
          setInternal(false);
        },
        onError: (err) => {
          const apiError = toApiError(err);
          setError(Object.values(apiError.fieldErrors ?? {})[0]?.[0] ?? apiError.message);
        },
      },
    );
  }

  return (
    <Card title={internal ? "Add an internal note" : "Reply to the client"} description={ticket.status === "closed" ? "This ticket is closed. A reply opens it again." : undefined}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error ? (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        ) : null}
        {saved.data && saved.data.length > 0 ? (
          <Select
            label="Insert a saved reply"
            value=""
            onChange={(e) => {
              insertSaved(e.target.value);
            }}
          >
            <option value="">Choose a saved reply…</option>
            {saved.data.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </Select>
        ) : saved.isSuccess ? (
          // Always say where saved replies live, so the box is not a mystery when nobody has added one yet.
          <p className="text-sm text-text-muted">
            No saved replies yet.{" "}
            <Link href="/tickets/replies" className="font-bold text-primary no-underline hover:underline">
              Add some
            </Link>{" "}
            to insert them here with one click.
          </p>
        ) : saved.isError ? (
          <p className="text-sm text-danger">Saved replies could not be loaded.</p>
        ) : null}
        <textarea
          aria-label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={7}
          maxLength={10000}
          placeholder={internal ? "Only staff will see this note." : "Write your reply…"}
          className={cn(controlClasses(false), "resize-y p-3", internal && "border-warning/40 bg-warning-soft")}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" size="sm" leadingIcon={<Paperclip aria-hidden="true" className="size-4" />} disabled={files.length >= ATTACHMENT_LIMITS.files} onClick={() => picker.current?.click()}>
            Attach files
          </Button>
          <input ref={picker} type="file" multiple accept={ATTACHMENT_LIMITS.extensions.map((e) => `.${e}`).join(",")} onChange={choose} className="hidden" />
          <span className="text-xs text-text-muted">Up to {ATTACHMENT_LIMITS.files} files, 5 MB each</span>
        </div>

        {files.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="inline-flex items-center gap-2 rounded-control bg-surface-muted px-3 py-1.5 text-xs">
                <span className="max-w-[180px] truncate">{file.name}</span>
                <span className="text-text-muted">{formatFileSize(file.size)}</span>
                <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles(files.filter((_, i) => i !== index))} className="text-text-muted hover:text-danger">
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Checkbox label="Internal note: do not send to the client" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
          <Button type="submit" loading={reply.isPending} disabled={!message.trim()}>
            {internal ? "Add note" : "Send reply"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Status, priority, department and assignee. Every change is saved at once. */
function Details({ ticket }: { ticket: TicketThread }) {
  const update = useUpdateTicket(ticket.id);
  const assign = useAssignTicket(ticket.id);
  const options = useTicketOptions();

  const fail = (error: unknown) => toast({ title: "Could not save", description: toApiError(error).message, tone: "danger" });
  const saved = () => toast({ title: "Saved", tone: "success" });
  const busy = update.isPending || assign.isPending;

  return (
    <Card title="Details" padding="md">
      <dl className="flex flex-col gap-4 text-sm">
        <div>
          <dt className="mb-1 text-xs font-bold text-text-muted">Client</dt>
          <dd className="font-bold">{ticket.client.accountName ?? "—"}</dd>
          {ticket.client.openedBy ? (
            <dd className="text-text-muted">
              {ticket.client.openedBy.name} · {ticket.client.openedBy.email}
            </dd>
          ) : null}
        </div>
        <div>
          <dt className="mb-1 text-xs font-bold text-text-muted">Opened</dt>
          <dd suppressHydrationWarning>{whenLabel(ticket.createdAt)}</dd>
        </div>
      </dl>

      <Can permission="tickets.edit" fallback={<p className="text-sm text-text-muted">You can read this ticket, but not change it.</p>}>
        <div className="flex flex-col gap-3">
          <Select label="Status" disabled={busy} value={ticket.status} onChange={(e) => update.mutate({ status: e.target.value as TicketStatus }, { onSuccess: saved, onError: fail })}>
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TICKET_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select label="Priority" disabled={busy} value={ticket.priority} onChange={(e) => update.mutate({ priority: e.target.value as TicketPriority }, { onSuccess: saved, onError: fail })}>
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TICKET_PRIORITY_LABELS[p]}
              </option>
            ))}
          </Select>
          <Select label="Department" disabled={busy || !options.data} value={ticket.department.id} onChange={(e) => update.mutate({ departmentId: e.target.value }, { onSuccess: saved, onError: fail })}>
            {(options.data?.departments ?? [{ id: ticket.department.id, name: ticket.department.name }]).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
      </Can>

      <Can permission="tickets.assign">
        <Select
          label="Assigned to"
          disabled={busy || !options.data}
          value={ticket.assignedTo?.id ?? ""}
          onChange={(e) => assign.mutate(e.target.value || null, { onSuccess: saved, onError: fail })}
        >
          <option value="">Unassigned</option>
          {(options.data?.assignees ?? (ticket.assignedTo ? [ticket.assignedTo] : [])).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Can>
    </Card>
  );
}

export function TicketView({ id }: { id: string }) {
  const { data: ticket, isPending, isError, error, refetch, isRefetching } = useTicket(id);

  const back = (
    <Link href="/tickets" className="inline-flex w-fit items-center gap-1.5 text-sm font-bold text-text-muted no-underline hover:text-primary">
      <ArrowLeft aria-hidden="true" className="size-4" />
      All tickets
    </Link>
  );

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <Alert tone="danger" role="alert" title="The ticket couldn't be loaded">
          <div className="flex flex-col items-start gap-3">
            <span>{toApiError(error).message}</span>
            <Button variant="secondary" size="sm" loading={isRefetching} onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Loading ticket">
        {back}
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {back}
      <PageHeader eyebrow={ticket.number} title={ticket.subject} description={ticket.department.name} actions={<TicketStatusPill status={ticket.status} />} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start md:gap-6">
        <div className="flex min-w-0 flex-col gap-4 md:gap-6">
          <ul className="flex flex-col gap-3">
            {ticket.replies.map((reply) => (
              <Message key={reply.id} ticketId={ticket.id} reply={reply} />
            ))}
          </ul>
          <Can permission="tickets.edit">
            <ReplyForm ticket={ticket} />
          </Can>
        </div>
        <Details ticket={ticket} />
      </div>
    </div>
  );
}
