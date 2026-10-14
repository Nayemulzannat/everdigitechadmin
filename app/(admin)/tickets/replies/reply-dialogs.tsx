"use client";

import { useRef, useState, type FormEvent } from "react";
import { Alert, Button, Dialog, FieldError, Input, controlClasses } from "@/components/ui";
import { toApiError } from "@/lib/api/errors";
import { CANNED_PLACEHOLDERS, useCreateCannedReply, useDeleteCannedReply, useUpdateCannedReply, type CannedReply } from "@/lib/api/canned-replies";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";

const FORM_ID = "canned-reply-form";

/** Add (no reply) or edit (with one). Mounted only while open, so the fields always start fresh. */
export type ReplyFormMode = { type: "create" } | { type: "edit"; reply: CannedReply };

export function ReplyFormDialog({ mode, onClose }: { mode: ReplyFormMode | null; onClose: () => void }) {
  return mode ? <OpenForm key={mode.type === "edit" ? mode.reply.id : "new"} mode={mode} onClose={onClose} /> : null;
}

function OpenForm({ mode, onClose }: { mode: ReplyFormMode; onClose: () => void }) {
  const editing = mode.type === "edit";
  const create = useCreateCannedReply();
  const update = useUpdateCannedReply();
  const titleRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState(editing ? mode.reply.title : "");
  const [body, setBody] = useState(editing ? mode.reply.body : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState("");
  const pending = create.isPending || update.isPending;

  function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setBanner("");
    const found: Record<string, string> = {};
    if (!title.trim()) found.title = "Give it a short title, so you can find it in the list.";
    if (!body.trim()) found.body = "Write the reply.";
    if (Object.keys(found).length) return setErrors(found);

    const input = { title: title.trim(), body: body.trim() };
    const options = {
      onSuccess: () => {
        toast({ title: editing ? "Reply saved" : "Reply added", tone: "success" });
        onClose();
      },
      onError: (raw: unknown) => {
        const error = toApiError(raw);
        const fields = Object.fromEntries(Object.entries(error.fieldErrors ?? {}).map(([field, messages]) => [field, messages[0] ?? error.message]));
        if (Object.keys(fields).length) setErrors(fields);
        else setBanner(error.message);
      },
    };

    if (mode.type === "edit") update.mutate({ id: mode.reply.id, input }, options);
    else create.mutate(input, options);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? `Edit "${mode.reply.title}"` : "Add a saved reply"}
      description="Staff can insert it into any ticket with one click, and change it before sending."
      initialFocusRef={titleRef}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} loading={pending}>
            {editing ? "Save changes" : "Add reply"}
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
        <Input ref={titleRef} label="Title" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} error={errors.title} placeholder="For example: Clear your cache" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="canned-body" className="text-sm font-semibold">
            Reply
          </label>
          <textarea
            id="canned-body"
            value={body}
            maxLength={10000}
            rows={9}
            onChange={(e) => setBody(e.target.value)}
            aria-invalid={errors.body ? true : undefined}
            placeholder={"Hello {client_name},\n\nThank you for contacting us about {ticket_number}.\n\nRegards,\n{staff_name}"}
            className={cn(controlClasses(Boolean(errors.body)), "resize-y p-3")}
          />
          {errors.body ? <FieldError id="canned-body-error">{errors.body}</FieldError> : null}
          <p className="text-[13px] text-text-muted">
            These are filled in when you insert the reply: {CANNED_PLACEHOLDERS.map((p) => <code key={p} className="mr-1.5 rounded bg-surface-muted px-1.5 py-0.5 text-xs">{p}</code>)}
          </p>
        </div>
      </form>
    </Dialog>
  );
}

/** Asks before deleting. Tickets that already used the reply are not changed. */
export function DeleteReplyDialog({ reply, onClose }: { reply: CannedReply | null; onClose: () => void }) {
  const remove = useDeleteCannedReply();

  function close() {
    remove.reset();
    onClose();
  }

  return (
    <Dialog
      open={reply !== null}
      onClose={close}
      title={`Delete "${reply?.title ?? ""}"?`}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="danger-outline"
            loading={remove.isPending}
            onClick={() =>
              reply &&
              remove.mutate(reply.id, {
                onSuccess: () => {
                  toast({ title: "Reply deleted", tone: "success" });
                  close();
                },
              })
            }
          >
            Delete reply
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
        <p className="text-[15px] text-text-secondary">It will no longer be in the list. Replies already sent to clients are not changed.</p>
      </div>
    </Dialog>
  );
}
