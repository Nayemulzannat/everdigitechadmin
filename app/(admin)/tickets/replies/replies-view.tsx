"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Alert, Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { useCannedReplies, type CannedReply } from "@/lib/api/canned-replies";
import { DeleteReplyDialog, ReplyFormDialog, type ReplyFormMode } from "./reply-dialogs";

export function RepliesView() {
  const { data, isPending, isError, refetch, isRefetching } = useCannedReplies();
  const [form, setForm] = useState<ReplyFormMode | null>(null);
  const [deleting, setDeleting] = useState<CannedReply | null>(null);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Link href="/tickets" className="inline-flex w-fit items-center gap-1.5 text-sm font-bold text-text-muted no-underline hover:text-primary">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Support tickets
      </Link>

      <PageHeader
        eyebrow="Support"
        title="Saved replies"
        description="Answers you give again and again. Staff insert one into a ticket with one click, and can change it before sending."
        actions={
          <Button leadingIcon={<Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />} onClick={() => setForm({ type: "create" })}>
            Add reply
          </Button>
        }
      />

      <Card padding="none">
        {isError ? (
          <div className="p-4 md:p-5">
            <Alert tone="danger" role="alert" title="Saved replies couldn't be loaded">
              <div className="flex flex-col items-start gap-3">
                <span>Check your connection and try again.</span>
                <Button variant="secondary" size="sm" loading={isRefetching} onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            </Alert>
          </div>
        ) : isPending ? (
          <div role="status" aria-label="Loading saved replies" className="flex flex-col">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex flex-col gap-2 border-t border-divider px-5 py-4 first:border-t-0">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-full max-w-xl" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState title="No saved replies yet" text="Add the answers you give most often, for example how to clear a cache or restart a service." />
        ) : (
          <ul className="divide-y divide-divider">
            {data.map((reply) => (
              <li key={reply.id} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-start md:gap-5 md:px-5">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="font-extrabold">{reply.title}</p>
                  {/* Plain text, shortened: the full text is in the edit window. */}
                  <p className="line-clamp-3 text-sm break-words whitespace-pre-wrap text-text-muted">{reply.body}</p>
                  {reply.createdBy ? <p className="text-xs text-text-muted">Added by {reply.createdBy}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" leadingIcon={<Pencil aria-hidden="true" className="size-4" />} onClick={() => setForm({ type: "edit", reply })}>
                    Edit
                  </Button>
                  <Button iconOnly variant="secondary" size="sm" aria-label={`Delete ${reply.title}`} onClick={() => setDeleting(reply)}>
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ReplyFormDialog mode={form} onClose={() => setForm(null)} />
      <DeleteReplyDialog reply={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
