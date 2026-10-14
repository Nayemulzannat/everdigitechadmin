import type { ApiResource } from "@/types/api";
import { ADMIN_PREFIX, api } from "./client";

/** One client message staff have not been told about yet: a new ticket, or a reply in an existing one. */
export interface TicketFeedEvent {
  replyId: string;
  ticketId: string;
  /** "TKT-000123" */
  number: string;
  subject: string;
  kind: "new_ticket" | "client_reply";
  priority: "low" | "medium" | "high";
  accountName: string | null;
  authorName: string | null;
  createdAt: string;
}

export interface TicketFeed {
  /** Id of the latest client message seen. Send it back as `after` on the next poll. */
  cursor: number;
  /** Tickets waiting for support (status open). Shown as the badge on the menu. */
  waiting: number;
  events: TicketFeedEvent[];
}

/**
 * GET /api/admin/tickets/feed?after=<cursor>. Without `after` it answers only the starting cursor and no events, so
 * opening the panel never replays old tickets as "new".
 */
export async function getTicketFeed(after: number | null): Promise<TicketFeed> {
  return (await api.get<ApiResource<TicketFeed>>(`${ADMIN_PREFIX}/tickets/feed`, { params: after === null ? undefined : { after }, skipAuthRedirect: false })).data.data;
}
