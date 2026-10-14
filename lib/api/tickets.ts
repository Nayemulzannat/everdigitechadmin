import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResource } from "@/types/api";
import type { TicketOptions, TicketPriority, TicketsIndexResponse, TicketsPage, TicketsParams, TicketStatus, TicketThread } from "@/types/tickets";
import { ADMIN_PREFIX, api } from "./client";

export type * from "@/types/tickets";

// Tickets have no mock mode: they always call the Laravel API.

export const TICKET_STATUSES = ["open", "answered", "closed"] as const satisfies readonly TicketStatus[];
export const TICKET_PRIORITIES = ["low", "medium", "high"] as const satisfies readonly TicketPriority[];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Waiting for support",
  answered: "Answered",
  closed: "Closed",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = { low: "Low", medium: "Medium", high: "High" };

export const ATTACHMENT_LIMITS = { files: 3, bytes: 5 * 1024 * 1024, extensions: ["jpg", "jpeg", "png", "webp", "pdf", "txt", "log", "zip"] } as const;

export const ticketKeys = {
  all: ["tickets"] as const,
  list: (params: TicketsParams) => [...ticketKeys.all, "list", params] as const,
  detail: (id: string) => [...ticketKeys.all, "detail", id] as const,
  options: () => [...ticketKeys.all, "options"] as const,
};

/** Defaults ("all", empty search, page 1) are left out of the query string. */
function toQuery(params: TicketsParams) {
  return {
    page: params.page > 1 ? params.page : undefined,
    status: params.status === "all" ? undefined : params.status,
    priority: params.priority === "all" ? undefined : params.priority,
    department: params.department === "all" ? undefined : params.department,
    assigned: params.assigned === "all" ? undefined : params.assigned,
    search: params.search.trim() || undefined,
  };
}

/** GET /api/admin/tickets */
export async function getTickets(params: TicketsParams): Promise<TicketsPage> {
  const res = (await api.get<TicketsIndexResponse>(`${ADMIN_PREFIX}/tickets`, { params: toQuery(params) })).data;

  return {
    items: res.data,
    total: res.meta.total,
    page: res.meta.current_page,
    pageSize: res.meta.per_page,
    pageCount: Math.max(1, res.meta.last_page),
    counts: res.meta.counts,
  };
}

/** GET /api/admin/tickets/{id}: the whole thread, staff notes included. */
export async function getTicket(id: string): Promise<TicketThread> {
  return (await api.get<ApiResource<TicketThread>>(`${ADMIN_PREFIX}/tickets/${id}`)).data.data;
}

/** GET /api/admin/tickets/options: departments and the staff a ticket can be assigned to. */
export async function getTicketOptions(): Promise<TicketOptions> {
  return (await api.get<ApiResource<TicketOptions>>(`${ADMIN_PREFIX}/tickets/options`)).data.data;
}

export interface ReplyInput {
  message: string;
  /** A note between staff: the client is not told and does not see it. */
  internal: boolean;
  files: File[];
}

/** POST /api/admin/tickets/{id}/replies (multipart: a file cannot travel in JSON). */
export async function replyToTicket(id: string, input: ReplyInput): Promise<TicketThread> {
  const form = new FormData();
  form.append("message", input.message);
  form.append("internal", input.internal ? "1" : "0");
  input.files.forEach((file) => form.append("attachments[]", file));

  return (await api.post<ApiResource<TicketThread>>(`${ADMIN_PREFIX}/tickets/${id}/replies`, form)).data.data;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  departmentId?: string;
}

/** PUT /api/admin/tickets/{id} */
export async function updateTicket(id: string, input: UpdateTicketInput): Promise<TicketThread> {
  return (await api.put<ApiResource<TicketThread>>(`${ADMIN_PREFIX}/tickets/${id}`, input)).data.data;
}

/** POST /api/admin/tickets/{id}/assign. `null` takes the ticket back. */
export async function assignTicket(id: string, adminId: string | null): Promise<TicketThread> {
  return (await api.post<ApiResource<TicketThread>>(`${ADMIN_PREFIX}/tickets/${id}/assign`, { adminId: adminId === null ? null : Number(adminId) })).data.data;
}

/** A plain link: the browser sends the session cookie and downloads the file (never shown inside the page). */
export function ticketAttachmentUrl(ticketId: string, attachmentId: string) {
  return `${process.env.NEXT_PUBLIC_API_URL ?? ""}${ADMIN_PREFIX}/tickets/${ticketId}/attachments/${attachmentId}`;
}

/** Keeps the previous page on screen while the next one loads. */
export function useTickets(params: TicketsParams) {
  return useQuery({ queryKey: ticketKeys.list(params), queryFn: () => getTickets(params), placeholderData: keepPreviousData });
}

export function useTicket(id: string) {
  return useQuery({ queryKey: ticketKeys.detail(id), queryFn: () => getTicket(id) });
}

export function useTicketOptions() {
  return useQuery({ queryKey: ticketKeys.options(), queryFn: getTicketOptions, staleTime: 5 * 60_000 });
}

/** After a change: the thread is replaced with the answer, and every list is fetched again (counts and order changed). */
function useTicketMutation<TInput>(mutationFn: (input: TInput) => Promise<TicketThread>, id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (thread) => {
      queryClient.setQueryData(ticketKeys.detail(id), thread);
      void queryClient.invalidateQueries({ queryKey: [...ticketKeys.all, "list"] });
    },
  });
}

export const useReplyToTicket = (id: string) => useTicketMutation((input: ReplyInput) => replyToTicket(id, input), id);
export const useUpdateTicket = (id: string) => useTicketMutation((input: UpdateTicketInput) => updateTicket(id, input), id);
export const useAssignTicket = (id: string) => useTicketMutation((adminId: string | null) => assignTicket(id, adminId), id);
