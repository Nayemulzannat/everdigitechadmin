import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResource } from "@/types/api";
import type { TicketDepartment, TicketDepartmentInput } from "@/types/tickets";
import { ADMIN_PREFIX, api } from "./client";
import { ticketKeys } from "./tickets";

export type { TicketDepartment, TicketDepartmentInput } from "@/types/tickets";

// Departments have no mock mode: they always call the Laravel API.

const BASE = `${ADMIN_PREFIX}/ticket-departments`;

export const departmentKeys = { all: ["ticket-departments"] as const };

/** GET /api/admin/ticket-departments: all of them, switched off ones too, in the order clients see them. */
export async function getTicketDepartments(): Promise<TicketDepartment[]> {
  return (await api.get<ApiResource<TicketDepartment[]>>(BASE)).data.data;
}

export async function createTicketDepartment(input: TicketDepartmentInput): Promise<TicketDepartment> {
  return (await api.post<ApiResource<TicketDepartment>>(BASE, input)).data.data;
}

export async function updateTicketDepartment(id: string, input: Partial<TicketDepartmentInput>): Promise<TicketDepartment> {
  return (await api.put<ApiResource<TicketDepartment>>(`${BASE}/${id}`, input)).data.data;
}

/** Only a department no ticket uses; otherwise the API answers 422 department_in_use. */
export async function deleteTicketDepartment(id: string): Promise<void> {
  await api.delete(`${BASE}/${id}`);
}

/** `ids` is every department id in the new order. */
export async function reorderTicketDepartments(ids: string[]): Promise<TicketDepartment[]> {
  return (await api.post<ApiResource<TicketDepartment[]>>(`${BASE}/reorder`, { ids: ids.map(Number) })).data.data;
}

export function useTicketDepartments() {
  return useQuery({ queryKey: departmentKeys.all, queryFn: getTicketDepartments });
}

/** The ticket filters and the ticket screen list departments too, so they are fetched again after a change. */
function useRefreshDepartments() {
  const queryClient = useQueryClient();

  return () => Promise.all([queryClient.invalidateQueries({ queryKey: departmentKeys.all }), queryClient.invalidateQueries({ queryKey: ticketKeys.options() })]);
}

export function useCreateTicketDepartment() {
  const refresh = useRefreshDepartments();
  return useMutation({ mutationFn: createTicketDepartment, onSuccess: refresh });
}

export function useUpdateTicketDepartment() {
  const refresh = useRefreshDepartments();
  return useMutation({ mutationFn: ({ id, input }: { id: string; input: Partial<TicketDepartmentInput> }) => updateTicketDepartment(id, input), onSuccess: refresh });
}

export function useDeleteTicketDepartment() {
  const refresh = useRefreshDepartments();
  return useMutation({ mutationFn: deleteTicketDepartment, onSuccess: refresh });
}

export function useReorderTicketDepartments() {
  const queryClient = useQueryClient();
  const refresh = useRefreshDepartments();

  return useMutation({
    mutationFn: reorderTicketDepartments,
    // The answer is the list in its new order, so the screen changes at once.
    onSuccess: (list) => {
      queryClient.setQueryData(departmentKeys.all, list);
      return refresh();
    },
  });
}
