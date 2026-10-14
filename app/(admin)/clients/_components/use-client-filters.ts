"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CLIENT_GROUPS, CLIENT_STATUSES, type ClientsParams } from "@/lib/api/clients";

const isStatus = (v: string | null): v is (typeof CLIENT_STATUSES)[number] =>
  CLIENT_STATUSES.includes(v as (typeof CLIENT_STATUSES)[number]);
const isGroup = (v: string | null): v is (typeof CLIENT_GROUPS)[number] =>
  CLIENT_GROUPS.includes(v as (typeof CLIENT_GROUPS)[number]);

/** Reads the list filters from the URL (?status=&group=&q=&page=). Unknown values fall back to the defaults. */
function parse(search: URLSearchParams): ClientsParams {
  const status = search.get("status");
  const group = search.get("group");
  const page = Number.parseInt(search.get("page") ?? "", 10);
  return {
    status: isStatus(status) ? status : "all",
    group: isGroup(group) ? group : "all",
    search: search.get("q") ?? "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Defaults are left out so a clean list is just /clients. */
function toQueryString(params: ClientsParams) {
  const out = new URLSearchParams();
  if (params.status !== "all") out.set("status", params.status);
  if (params.group !== "all") out.set("group", params.group);
  if (params.search.trim()) out.set("q", params.search.trim());
  if (params.page > 1) out.set("page", String(params.page));
  const qs = out.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Client list filters stored in the URL, so refresh, shared links and the back button keep them.
 * Changing any filter resets to page 1. Pass `{ history: "replace" }` for rapid changes such as search typing.
 */
export function useClientFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parse(new URLSearchParams(searchParams.toString()));

  const setFilters = useCallback(
    (patch: Partial<ClientsParams>, { history = "push" }: { history?: "push" | "replace" } = {}) => {
      const current = parse(new URLSearchParams(window.location.search));
      const next: ClientsParams = { ...current, ...patch, page: patch.page ?? 1 };
      const href = `${pathname}${toQueryString(next)}`;
      if (history === "replace") router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [pathname, router],
  );

  const clearFilters = useCallback(() => router.push(pathname, { scroll: false }), [pathname, router]);

  const hasFilters = filters.status !== "all" || filters.group !== "all" || filters.search.trim() !== "";

  return { filters, setFilters, clearFilters, hasFilters };
}
