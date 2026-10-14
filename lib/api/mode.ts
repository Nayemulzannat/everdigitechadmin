import { handleApiFailure } from "./client";
import { toApiError } from "./errors";

/** The parts of the API that can be mocked on their own. Each lib/api module belongs to one area. */
export const MOCK_AREAS = ["auth", "dashboard", "roles", "clients", "staff"] as const;
export type MockArea = (typeof MOCK_AREAS)[number];

/**
 * Whether `area` is mocked for a NEXT_PUBLIC_USE_MOCK value:
 * - "true" (or "all"): every area, no Laravel needed;
 * - "" or "false": none, everything calls the API;
 * - a comma list such as "dashboard" or "dashboard,clients": only those areas are mocked.
 */
export function isMockArea(setting: string | undefined, area: MockArea): boolean {
  const value = (setting ?? "").trim().toLowerCase();
  if (value === "true" || value === "all") return true;
  return value
    .split(",")
    .map((name) => name.trim())
    .includes(area);
}

// Next.js inlines the variable at build time, so the mock modules (loaded with import()) drop out of builds where
// their area isn't mocked.
const SETTING = process.env.NEXT_PUBLIC_USE_MOCK;

export const isMock = (area: MockArea) => isMockArea(SETTING, area);

/**
 * Runs the mock or the real request for an area. Mock failures go through the same 401/403 handling as real ones, so
 * components can't tell the modes apart.
 */
export async function request<T>(area: MockArea, mock: () => Promise<T>, real: () => Promise<T>): Promise<T> {
  if (!isMock(area)) return real();
  try {
    return await mock();
  } catch (raw) {
    const error = toApiError(raw);
    handleApiFailure(error);
    throw error;
  }
}
