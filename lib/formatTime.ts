import { Temporal } from "temporal-polyfill";

function toLocalZonedDateTime(iso: string) {
  return Temporal.Instant.from(iso).toZonedDateTimeISO(Temporal.Now.timeZoneId());
}

export function formatDateTime(iso: string): string {
  return toLocalZonedDateTime(iso).toLocaleString();
}

export function formatTime(iso: string): string {
  return toLocalZonedDateTime(iso).toLocaleString(undefined, { timeStyle: "medium" });
}

export function msSince(iso: string): number {
  return Temporal.Now.instant().epochMilliseconds - Temporal.Instant.from(iso).epochMilliseconds;
}

export function formatDate(isoDate: string): string {
  return Temporal.PlainDate.from(isoDate).toLocaleString(undefined, { dateStyle: "medium" });
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round(Temporal.Instant.from(endIso).since(Temporal.Instant.from(startIso)).total("minutes"));
}

// millisecond precision matches Date().toISOString()'s format exactly, so
// this is a drop-in for any column previously written by that.
export function nowIso(): string {
  return Temporal.Now.instant().toString({ smallestUnit: "millisecond" });
}

export function nowMs(): number {
  return Temporal.Now.instant().epochMilliseconds;
}

export function epochMs(iso: string): number {
  return Temporal.Instant.from(iso).epochMilliseconds;
}

export function formatDuration(totalMinutes: number, t: (key: string, options: Record<string, number>) => string): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return t("history.duration.minutes", { m });
  if (m === 0) return t("history.duration.hours", { h });
  return t("history.duration.hoursMinutes", { h, m });
}
