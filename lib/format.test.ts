import { describe, expect, it } from "vitest";
import { formatAgo, formatRecentDateTime } from "./format";

// "Now" is 5 Oct 2026, 12:00 in Dhaka (UTC+6).
const NOW = "2026-10-05T06:00:00Z";

describe("formatRecentDateTime", () => {
  it("says Today and Yesterday with the clock time in Bangladesh time", () => {
    expect(formatRecentDateTime("2026-10-05T04:42:00Z", NOW)).toBe("Today, 10:42 AM");
    expect(formatRecentDateTime("2026-10-04T12:15:00Z", NOW)).toBe("Yesterday, 6:15 PM");
  });

  it("uses the Bangladesh day, not the UTC day", () => {
    // 20:00 UTC on the 4th is 02:00 on the 5th in Dhaka: still today.
    expect(formatRecentDateTime("2026-10-04T20:00:00Z", NOW)).toBe("Today, 2:00 AM");
  });

  it("writes older dates in full without a leading zero", () => {
    expect(formatRecentDateTime("2026-09-30T08:00:00Z", NOW)).toBe("30 Sep 2026");
    expect(formatRecentDateTime("2026-09-03T08:00:00Z", NOW)).toBe("3 Sep 2026");
  });
});

describe("formatAgo", () => {
  const ago = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();

  it("counts minutes, hours and days", () => {
    expect(formatAgo(ago(30_000), NOW)).toBe("just now");
    expect(formatAgo(ago(15 * 60_000), NOW)).toBe("15 minutes ago");
    expect(formatAgo(ago(60 * 60_000), NOW)).toBe("1 hour ago");
    expect(formatAgo(ago(5 * 60 * 60_000), NOW)).toBe("5 hours ago");
    expect(formatAgo(ago(24 * 60 * 60_000), NOW)).toBe("1 day ago");
    expect(formatAgo(ago(2.4 * 24 * 60 * 60_000), NOW)).toBe("2 days ago");
  });

  it("never goes negative for a time slightly in the future", () => {
    expect(formatAgo("2026-10-05T06:00:30Z", NOW)).toBe("just now");
  });
});
