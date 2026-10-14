"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TICKET_PRIORITIES, TICKET_STATUSES, type TicketsParams } from "@/lib/api/tickets";

const isStatus = (v: string | null): v is (typeof TICKET_STATUSES)[number] => TICKET_STATUSES.includes(v as (typeof TICKET_STATUSES)[number]);
const isPriority = (v: string | null): v is (typeof TICKET_PRIORITIES)[number] => TICKET_PRIORITIES.includes(v as (typeof TICKET_PRIORITIES)[number]);

/** Reads the list filters from the URL (?status=&priority=&department=&assigned=&q=&page=). Unknown values fall back to the defaults. */
function parse(search: URLSearchParams): TicketsParams {
  const status = search.get("status");
  const priority = search.get("priority");
  const assigned = search.get("assigned") ?? "";
  const department = search.get("department") ?? "";
  const page = Number.parseInt(search.get("page") ?? "", 10);

  return {
    status: isStatus(status) ? status : "all",
    priority: isPriority(priority) ? priority : "all",
    department: /^\d+$/.test(department) ? department : "all",
    assigned: /^(me|unassigned|\d+)$/.test(assigned) ? assigned : "all",
    search: search.get("q") ?? "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Defaults are left out so a clean list is just /tickets. */
function toQueryString(params: TicketsParams) {
  const out = new URLSearchParams();
  if (params.status !== "all") out.set("status", params.status);
  if (params.priority !== "all") out.set("priority", params.priority);
  if (params.department !== "all") out.set("department", params.department);
  if (params.assigned !== "all") out.set("assigned", params.assigned);
  if (params.search.trim()) out.set("q", params.search.trim());
  if (params.page > 1) out.set("page", String(params.page));
  const qs = out.toString();

  return qs ? `?${qs}` : "";
}

/** Ticket list filters stored in the URL, so refresh, shared links and the back button keep them. Changing a filter resets to page 1. */
export function useTicketFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parse(new URLSearchParams(searchParams.toString()));

  const setFilters = useCallback(
    (patch: Partial<TicketsParams>, { history = "push" }: { history?: "push" | "replace" } = {}) => {
      const current = parse(new URLSearchParams(window.location.search));
      const next: TicketsParams = { ...current, ...patch, page: patch.page ?? 1 };
      const href = `${pathname}${toQueryString(next)}`;
      if (history === "replace") router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [pathname, router],
  );

  const clearFilters = useCallback(() => router.push(pathname, { scroll: false }), [pathname, router]);
  const hasFilters = filters.status !== "all" || filters.priority !== "all" || filters.department !== "all" || filters.assigned !== "all" || filters.search.trim() !== "";

  return { filters, setFilters, clearFilters, hasFilters };
}
