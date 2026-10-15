import { format, parseISO, startOfDay } from "date-fns";

/** "2026-10-15" style key in the local timezone. */
export function dayKey(d: Date | string): string {
  const date = typeof d === "string" ? parseISO(d) : d;
  return format(date, "yyyy-MM-dd");
}

/**
 * Turn a "yyyy-MM-dd" string from an <input type="date"> into a Date at local noon.
 * Using noon avoids off-by-one issues around daylight-saving changes.
 */
export function fromDateInput(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/** Date -> "yyyy-MM-dd" for <input type="date"> values. */
export function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  return dayKey(typeof d === "string" ? new Date(d) : d);
}

export function today(): Date {
  return startOfDay(new Date());
}

export function minutesToLabel(min: number): string {
  if (!min) return "0m";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}
