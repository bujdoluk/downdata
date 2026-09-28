import { Temporal } from "temporal-polyfill";

function toLocalZonedDateTime(iso: string, timeZone: string) {
  return Temporal.Instant.from(iso).toZonedDateTimeISO(timeZone);
}

export function formatDateTime(iso: string, timeZone: string): string {
  return toLocalZonedDateTime(iso, timeZone).toLocaleString();
}

export function formatTime(iso: string, timeZone: string): string {
  return toLocalZonedDateTime(iso, timeZone).toLocaleString(undefined, { timeStyle: "medium" });
}

export function msSince(iso: string): number {
  return Temporal.Now.instant().epochMilliseconds - Temporal.Instant.from(iso).epochMilliseconds;
}

export function formatDate(isoDate: string): string {
  return Temporal.PlainDate.from(isoDate).toLocaleString(undefined, { dateStyle: "medium" });
}

export function formatMonthYear(iso: string, timeZone: string): string {
  return toLocalZonedDateTime(iso, timeZone).toLocaleString(undefined, { year: "numeric", month: "long" });
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round(Temporal.Instant.from(endIso).since(Temporal.Instant.from(startIso)).total("minutes"));
}

// Millisecond precision matches Date().toISOString(), so existing columns stay format-compatible.
export function nowIso(): string {
  return Temporal.Now.instant().toString({ smallestUnit: "millisecond" });
}

export function nowMs(): number {
  return Temporal.Now.instant().epochMilliseconds;
}

export function nowPlusIso(durationMs: number): string {
  return Temporal.Now.instant().add({ milliseconds: durationMs }).toString({ smallestUnit: "millisecond" });
}

export function epochMs(iso: string): number {
  return Temporal.Instant.from(iso).epochMilliseconds;
}

export function isoFromEpochMs(ms: number): string {
  return Temporal.Instant.fromEpochMilliseconds(ms).toString({ smallestUnit: "millisecond" });
}

export function isoDaysAgo(days: number): string {
  return Temporal.Now.instant().subtract({ hours: days * 24 }).toString({ smallestUnit: "millisecond" });
}

// Stripe webhooks send Unix seconds, not milliseconds.
export function isoFromUnixSeconds(seconds: number): string {
  return Temporal.Instant.fromEpochMilliseconds(seconds * 1000).toString({ smallestUnit: "millisecond" });
}

export function formatDuration(totalMinutes: number, t: (key: string, options: Record<string, number>) => string): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return t("history.duration.minutes", { m });
  if (m === 0) return t("history.duration.hours", { h });
  return t("history.duration.hoursMinutes", { h, m });
}
