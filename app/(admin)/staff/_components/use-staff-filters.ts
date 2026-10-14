"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STAFF_STATUSES, type StaffParams } from "@/lib/api/staff";

const isStatus = (v: string | null): v is (typeof STAFF_STATUSES)[number] => STAFF_STATUSES.includes(v as (typeof STAFF_STATUSES)[number]);

/** Reads the list filters from the URL (?status=&role=&q=&page=). Unknown values fall back to the defaults. */
function parse(search: URLSearchParams): StaffParams {
  const status = search.get("status");
  const role = search.get("role");
  const page = Number.parseInt(search.get("page") ?? "", 10);
  return {
    status: isStatus(status) ? status : "all",
    role: role && /^\d+$|^[\w-]+$/.test(role) ? role : "all",
    search: search.get("q") ?? "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Defaults are left out so a clean list is just /staff. */
function toQueryString(params: StaffParams) {
  const out = new URLSearchParams();
  if (params.status !== "all") out.set("status", params.status);
  if (params.role !== "all") out.set("role", params.role);
  if (params.search.trim()) out.set("q", params.search.trim());
  if (params.page > 1) out.set("page", String(params.page));
  const qs = out.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Staff list filters stored in the URL, so refresh, shared links and the back button keep them.
 * Changing any filter resets to page 1. Pass `{ history: "replace" }` for rapid changes such as search typing.
 */
export function useStaffFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parse(new URLSearchParams(searchParams.toString()));

  const setFilters = useCallback(
    (patch: Partial<StaffParams>, { history = "push" }: { history?: "push" | "replace" } = {}) => {
      const current = parse(new URLSearchParams(window.location.search));
      const next: StaffParams = { ...current, ...patch, page: patch.page ?? 1 };
      const href = `${pathname}${toQueryString(next)}`;
      if (history === "replace") router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [pathname, router],
  );

  const clearFilters = useCallback(() => router.push(pathname, { scroll: false }), [pathname, router]);

  const hasFilters = filters.status !== "all" || filters.role !== "all" || filters.search.trim() !== "";

  return { filters, setFilters, clearFilters, hasFilters };
}
