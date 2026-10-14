import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ApiResource } from "@/types/api";
import type { DashboardRange, DashboardSummary } from "@/types/dashboard";
import { ADMIN_PREFIX, api } from "./client";
import { request } from "./mode";

export type * from "@/types/dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: (range: DashboardRange) => [...dashboardKeys.all, "summary", range] as const,
};

/** GET /api/admin/dashboard/summary?range= */
export async function getDashboardSummary(range: DashboardRange): Promise<DashboardSummary> {
  return request(
    "dashboard",
    async () => (await import("@/lib/mock/dashboard")).getMockDashboardSummary(range),
    async () =>
      (await api.get<ApiResource<DashboardSummary>>(`${ADMIN_PREFIX}/dashboard/summary`, { params: { range } })).data.data,
  );
}

/** Keeps showing the previous range's numbers while a new range loads (no skeleton flash on switch). */
export function useDashboardSummary(range: DashboardRange) {
  return useQuery({
    queryKey: dashboardKeys.summary(range),
    queryFn: () => getDashboardSummary(range),
    placeholderData: keepPreviousData,
  });
}
