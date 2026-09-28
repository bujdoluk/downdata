// Pure, so it's safe on client, server and in unit tests.
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

// Largest evenly dividing unit, so 10080 redisplays as "1 week".
export function bestFitDuration(minutes: number): { value: number; unit: DurationUnit } {
  const units: DurationUnit[] = ["weeks", "days", "hours", "minutes"];
  for (const unit of units) {
    const perUnit = MINUTES_PER_UNIT[unit];
    if (minutes % perUnit === 0) return { value: minutes / perUnit, unit };
  }
  return { value: minutes, unit: "minutes" };
}

// English-only: server notification bodies have no i18n. The UI uses t() instead.
export function formatMinutesShort(minutes: number): string {
  const { value, unit } = bestFitDuration(minutes);
  const suffix = unit === "minutes" ? "m" : unit === "hours" ? "h" : unit === "days" ? "d" : "w";
  return `${value}${suffix}`;
}
