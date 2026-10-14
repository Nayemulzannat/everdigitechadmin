import { StatusPill, type StatusTone } from "@/components/ui";
import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS, type TicketPriority, type TicketStatus } from "@/lib/api/tickets";
import { cn } from "@/lib/cn";

const STATUS_TONE: Record<TicketStatus, StatusTone> = { open: "warning", answered: "success", closed: "neutral" };

export function TicketStatusPill({ status }: { status: TicketStatus }) {
  return <StatusPill tone={STATUS_TONE[status]}>{TICKET_STATUS_LABELS[status]}</StatusPill>;
}

const PRIORITY_CLASS: Record<TicketPriority, string> = { high: "text-danger", medium: "text-warning", low: "text-text-muted" };

export function TicketPriorityText({ priority }: { priority: TicketPriority }) {
  return <span className={cn("text-xs font-bold", PRIORITY_CLASS[priority])}>{TICKET_PRIORITY_LABELS[priority]}</span>;
}

/** "5 min ago", "3 h ago", or "12 Oct 2026, 3:20 pm". Computed from the browser clock, so call it only after mount or in client components. */
export function whenLabel(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;

  return date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
