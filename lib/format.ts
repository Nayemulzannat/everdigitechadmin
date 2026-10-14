// Shared display formatters. Fixed locale and time zone so server and browser always produce the same text.

const TIME_ZONE = "Asia/Dhaka";
const bdtNumber = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** Taka with Indian/Bangladeshi digit grouping: 482350 → "৳4,82,350". */
export function formatBDT(amount: number) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}৳${bdtNumber.format(Math.abs(Math.round(amount)))}`;
}

/** Short lakh label for chart axes: 500000 → "৳5L", 250000 → "৳2.5L", 0 → "0". */
export function formatLakh(amount: number) {
  if (amount === 0) return "0";
  const lakh = Math.round((amount / 100_000) * 10) / 10;
  return `৳${lakh}L`;
}

/** Grouped whole number: 1486 → "1,486". */
export function formatCount(value: number) {
  return bdtNumber.format(value);
}

/** Signed percentage: 12.4 → "+12.4%", -3 → "−3%". */
export function formatChange(percent: number) {
  const value = Math.abs(percent).toLocaleString("en-IN", { maximumFractionDigits: 1 });
  return `${percent < 0 ? "−" : "+"}${value}%`;
}

/** Duration in minutes: 80 → "1h 20m", 45 → "45m". */
export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** How long before `now` a time was: "12 min ago", "2 h ago", "3 d ago". */
export function formatTimeAgo(iso: string, now: string) {
  const minutes = Math.max(0, Math.round((Date.parse(now) - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

/** "Friday, 2 October 2026", in Bangladesh time. */
export function formatLongDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** "Good morning" / "Good afternoon" / "Good evening" for a moment, in Bangladesh time. */
export function greetingFor(iso: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(new Date(iso)),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09" → { short: "Sep", long: "Sep 2026" }. Parsed by hand so no time zone can shift the month. */
export function formatMonthKey(key: string) {
  const [year, month] = key.split("-").map(Number);
  const short = MONTHS[(month ?? 1) - 1] ?? "";
  return { short, long: `${short} ${year}` };
}

/** "2024-01-12" → "12 Jan 2024". Parsed by hand so no time zone can shift the day. */
export function formatShortDate(isoDate: string) {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return `${String(day ?? 1).padStart(2, "0")} ${MONTHS[(month ?? 1) - 1] ?? ""} ${year}`;
}

/** A time of day in Bangladesh time: "10:42 AM". */
function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit", hour12: true }).format(date);
}

/** The calendar day of a moment in Bangladesh time, as "2026-10-02" (en-CA writes dates that way). */
const dayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);

/**
 * "Today, 10:42 AM", "Yesterday, 6:15 PM", or "30 Sep 2026" for anything older. Days are Bangladesh days, so a
 * sign-in at 00:30 is "Today" there even when it is still yesterday in UTC.
 */
export function formatRecentDateTime(iso: string, nowIso: string) {
  const date = new Date(iso);
  const day = dayKey(date);
  const today = dayKey(new Date(nowIso));
  const yesterday = dayKey(new Date(Date.parse(nowIso) - 24 * 60 * 60_000));
  if (day === today) return `Today, ${formatClock(date)}`;
  if (day === yesterday) return `Yesterday, ${formatClock(date)}`;
  const [year, month, dayOfMonth] = day.split("-").map(Number);
  return `${dayOfMonth} ${MONTHS[(month ?? 1) - 1] ?? ""} ${year}`;
}

/** "just now", "3 hours ago", "1 day ago", "2 days ago": for lines like "Invite sent 2 days ago". */
export function formatAgo(iso: string, nowIso: string) {
  const minutes = Math.max(0, Math.round((Date.parse(nowIso) - Date.parse(iso)) / 60_000));
  if (minutes < 60) return minutes < 2 ? "just now" : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
