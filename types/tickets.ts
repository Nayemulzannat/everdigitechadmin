import type { PaginatedResource } from "./api";

export type TicketStatus = "open" | "answered" | "closed";
export type TicketPriority = "low" | "medium" | "high";

export interface TicketAttachment {
  id: string;
  name: string;
  /** Bytes. */
  size: number;
  mime: string;
}

export interface TicketReply {
  id: string;
  authorType: "client" | "staff";
  authorName: string;
  /** Plain text. Show it as text, never as HTML. */
  body: string;
  /** A note between staff: the client never sees it. */
  isInternal: boolean;
  /** ISO 8601 */
  createdAt: string;
  attachments: TicketAttachment[];
}

export interface Ticket {
  id: string;
  /** "TKT-000123" */
  number: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  department: { id: string; name: string };
  client: {
    accountId: string;
    accountName: string | null;
    openedBy: { name: string; email: string } | null;
  };
  assignedTo: { id: string; name: string } | null;
  lastReplyBy: "client" | "staff";
  lastReplyAt: string | null;
  createdAt: string;
  closedAt: string | null;
}

/** GET /api/admin/tickets/{id}: the ticket with its whole thread. */
export interface TicketThread extends Ticket {
  replies: TicketReply[];
}

export type TicketCounts = Record<TicketStatus | "all", number>;

/** GET /api/admin/tickets: a Laravel paginated collection with per-status `counts` in meta (for the tabs). */
export type TicketsIndexResponse = PaginatedResource<Ticket, { counts: TicketCounts }>;

/** Query of the list. "all" and empty values are left out of the request. */
export interface TicketsParams {
  /** 1-based. */
  page: number;
  status: TicketStatus | "all";
  priority: TicketPriority | "all";
  /** A department id, or "all". */
  department: string;
  /** "all", "me", "unassigned" or a staff id. */
  assigned: string;
  search: string;
}

export interface TicketOptions {
  departments: { id: string; name: string }[];
  assignees: { id: string; name: string }[];
}

export interface TicketsPage {
  items: Ticket[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  counts: TicketCounts;
}

/** A department, as the Departments screen shows it. */
export interface TicketDepartment {
  id: string;
  name: string;
  description: string | null;
  /** Switched off: clients cannot choose it, old tickets keep it. */
  isActive: boolean;
  sortOrder: number;
  ticketsCount: number;
}

export interface TicketDepartmentInput {
  name: string;
  description: string | null;
  isActive: boolean;
}

/** A saved answer for replying to tickets. The body may contain {client_name}, {ticket_number} and {staff_name}. */
export interface CannedReply {
  id: string;
  title: string;
  body: string;
  createdBy: string | null;
  /** ISO 8601 */
  updatedAt: string;
}

export interface CannedReplyInput {
  title: string;
  body: string;
}
