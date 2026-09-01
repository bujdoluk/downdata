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

// millisecond precision, same "drop-in for a Date-written column" shape
// as nowIso() — used for verification-code/token expiries.
export function nowPlusIso(durationMs: number): string {
  return Temporal.Now.instant().add({ milliseconds: durationMs }).toString({ smallestUnit: "millisecond" });
}

export function epochMs(iso: string): number {
  return Temporal.Instant.from(iso).epochMilliseconds;
}

// millisecond precision, same "drop-in for a Date-written column" shape as
// nowIso() — used for windowing a query to "the last N days".
export function isoDaysAgo(days: number): string {
  return Temporal.Now.instant().subtract({ hours: days * 24 }).toString({ smallestUnit: "millisecond" });
}

// Stripe (and most other webhook payloads) send Unix seconds, not
// milliseconds — this is the one inbound conversion, used by the billing
// webhook handler (lib/subscriptions.ts).
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
