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
