// Shared minutes<->unit conversion for the maintenance reminder feature —
// used by both ScheduleReminderModal.tsx (preset/Custom picker, client)
// and lib/pollMaintenanceReminders.ts (notification copy, server). Pure,
// no framework imports, safe in either context and in unit tests.
export type DurationUnit = "minutes" | "hours" | "days" | "weeks";

export const MINUTES_PER_UNIT: Record<DurationUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 60 * 24,
  weeks: 60 * 24 * 7,
};

export function toMinutes(value: number, unit: DurationUnit): number {
  return Math.round(value * MINUTES_PER_UNIT[unit]);
}

// The largest unit that divides `minutes` evenly, so a stored value
// round-trips back to whatever the user actually meant to type — 10080
// redisplays as "1 week", not "10080 minutes" or "168 hours". Falls back to
// minutes (always divides evenly) for anything irregular, e.g. a value that
// predates this unit system or a genuinely odd custom entry.
export function bestFitDuration(minutes: number): { value: number; unit: DurationUnit } {
  const units: DurationUnit[] = ["weeks", "days", "hours", "minutes"];
  for (const unit of units) {
    const perUnit = MINUTES_PER_UNIT[unit];
    if (minutes % perUnit === 0) return { value: minutes / perUnit, unit };
  }
  return { value: minutes, unit: "minutes" }; // unreachable — "minutes" always divides evenly
}

// Short, English-only label ("15m", "2h", "1d", "2w") — for the
// notification bodies only, which have no i18n story (see
// pollMaintenanceReminders.ts's own comment on why). The UI's own labels
// go through t() with proper unit words instead; this isn't reused there.
export function formatMinutesShort(minutes: number): string {
  const { value, unit } = bestFitDuration(minutes);
  const suffix = unit === "minutes" ? "m" : unit === "hours" ? "h" : unit === "days" ? "d" : "w";
  return `${value}${suffix}`;
}
