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
