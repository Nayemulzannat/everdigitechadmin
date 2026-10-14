import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResource } from "@/types/api";
import type { CannedReply, CannedReplyInput } from "@/types/tickets";
import { ADMIN_PREFIX, api } from "./client";

export type { CannedReply, CannedReplyInput } from "@/types/tickets";

// Saved replies have no mock mode: they always call the Laravel API. Everything needs tickets.edit.

const BASE = `${ADMIN_PREFIX}/canned-replies`;

export const cannedReplyKeys = { all: ["canned-replies"] as const };

/** The words in a saved reply that are filled in when it is inserted into a ticket. */
export const CANNED_PLACEHOLDERS = ["{client_name}", "{ticket_number}", "{staff_name}"] as const;

export async function getCannedReplies(): Promise<CannedReply[]> {
  return (await api.get<ApiResource<CannedReply[]>>(BASE)).data.data;
}

export async function createCannedReply(input: CannedReplyInput): Promise<CannedReply> {
  return (await api.post<ApiResource<CannedReply>>(BASE, input)).data.data;
}

export async function updateCannedReply(id: string, input: Partial<CannedReplyInput>): Promise<CannedReply> {
  return (await api.put<ApiResource<CannedReply>>(`${BASE}/${id}`, input)).data.data;
}

export async function deleteCannedReply(id: string): Promise<void> {
  await api.delete(`${BASE}/${id}`);
}

/** Fills {client_name}, {ticket_number} and {staff_name}. Unknown words in braces are left as they are. */
export function fillPlaceholders(body: string, values: { clientName: string; ticketNumber: string; staffName: string }) {
  return body
    .replaceAll("{client_name}", values.clientName)
    .replaceAll("{ticket_number}", values.ticketNumber)
    .replaceAll("{staff_name}", values.staffName);
}

/** `enabled` false when the person may not reply to tickets (the API would answer 403). */
export function useCannedReplies(enabled = true) {
  return useQuery({ queryKey: cannedReplyKeys.all, queryFn: getCannedReplies, enabled });
}

function useRefresh() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: cannedReplyKeys.all });
}

export function useCreateCannedReply() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: createCannedReply, onSuccess: refresh });
}

export function useUpdateCannedReply() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<CannedReplyInput> }) => updateCannedReply(id, input), onSuccess: refresh });
}

export function useDeleteCannedReply() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: deleteCannedReply, onSuccess: refresh });
}
