import { Temporal } from "temporal-polyfill";
import type { Incident, StatuspageIncidentSummary } from "@/types/service";

export type CalendarDay = {
  date: string;
  impact: string | null;
  incidents: Incident[];
  week: number; // 0-based column index across the whole grid
  dow: number; // 0 (Sunday) .. 6 (Saturday) — row index
};

export type CalendarMonthLabel = {
  label: string;
  week: number; // column index of that month's first day
};

export type IncidentCalendarData = {
  weeks: number;
  days: CalendarDay[];
  monthLabels: CalendarMonthLabel[];
  // "Today" in the timezone this calendar was built for — exposed so
  // IncidentCalendar.tsx can highlight the right cell without computing
  // its own, possibly browser-local, notion of "today" a second time.
  today: string;
};

const IMPACT_RANK = ["critical", "major", "minor", "none"];

// Structural, not Incident — only .impact is read, so this also satisfies
// StatuspageIncidentSummary (buildOutageTrackerDays below), same reasoning
// as lib/isActiveIncident.ts's structural param.
export function worstImpact(incidents: { impact: string }[]): string | null {
  if (incidents.length === 0) return null;
  let best = incidents[0]!.impact;
  let bestRank = IMPACT_RANK.indexOf(best);
  if (bestRank === -1) bestRank = IMPACT_RANK.length;
  for (const incident of incidents.slice(1)) {
    const rank = IMPACT_RANK.indexOf(incident.impact);
    const normalizedRank = rank === -1 ? IMPACT_RANK.length : rank;
    if (normalizedRank < bestRank) {
      best = incident.impact;
      bestRank = normalizedRank;
    }
  }
  return best;
}

export function buildIncidentCalendar(incidents: Incident[], year: number, locale: string, timeZone: string): IncidentCalendarData {
  const today = Temporal.Now.zonedDateTimeISO(timeZone).toPlainDate();
  const yearStart = Temporal.PlainDate.from({ year, month: 1, day: 1 });
  const yearEnd = Temporal.PlainDate.from({ year, month: 12, day: 31 });
  // ISO dayOfWeek is Monday=1..Sunday=7; %7 turns that into Sunday=0..Saturday=6.
  const gridStart = yearStart.subtract({ days: yearStart.dayOfWeek % 7 });

  const ranges = incidents.map((incident) => ({
    incident,
    start: Temporal.Instant.from(incident.created_at).toZonedDateTimeISO(timeZone).toPlainDate(),
    end: incident.resolved_at
      ? Temporal.Instant.from(incident.resolved_at).toZonedDateTimeISO(timeZone).toPlainDate()
      : today,
  }));

  const days: CalendarDay[] = [];
  const monthLabels: CalendarMonthLabel[] = [];

  let cursor = gridStart;
  let offset = 0;
  while (Temporal.PlainDate.compare(cursor, yearEnd) <= 0) {
    const week = Math.floor(offset / 7);
    const dow = offset % 7;

    if (Temporal.PlainDate.compare(cursor, yearStart) >= 0) {
      if (cursor.day === 1) {
        monthLabels.push({ label: cursor.toLocaleString(locale, { month: "short" }), week });
      }

      const dayIncidents = ranges
        .filter(({ start, end }) => Temporal.PlainDate.compare(cursor, start) >= 0 && Temporal.PlainDate.compare(cursor, end) <= 0)
        .map(({ incident }) => incident);

      days.push({ date: cursor.toString(), impact: worstImpact(dayIncidents), incidents: dayIncidents, week, dow });
    }

    cursor = cursor.add({ days: 1 });
    offset++;
  }

  const weeks = Math.floor((offset - 1) / 7) + 1;

  return { weeks, days, monthLabels, today: today.toString() };
}

export type TrackerDay = { date: string; impact: string | null; incidents: StatuspageIncidentSummary[] };

// Flat last-N-days list, not a year grid — no week/month-label bookkeeping,
// just the same "worst impact wins" per-day rule buildIncidentCalendar uses
// above. Powers ServiceDetail's outage tracker.
export function buildOutageTrackerDays(incidents: StatuspageIncidentSummary[], days: number, timeZone: string): TrackerDay[] {
  const today = Temporal.Now.zonedDateTimeISO(timeZone).toPlainDate();
  const start = today.subtract({ days: days - 1 });

  const ranges = incidents.map((incident) => ({
    incident,
    start: Temporal.Instant.from(incident.created_at).toZonedDateTimeISO(timeZone).toPlainDate(),
    end: incident.resolved_at
      ? Temporal.Instant.from(incident.resolved_at).toZonedDateTimeISO(timeZone).toPlainDate()
      : today,
  }));

  const result: TrackerDay[] = [];
  let cursor = start;
  while (Temporal.PlainDate.compare(cursor, today) <= 0) {
    const dayIncidents = ranges
      .filter(({ start: rangeStart, end }) => Temporal.PlainDate.compare(cursor, rangeStart) >= 0 && Temporal.PlainDate.compare(cursor, end) <= 0)
      .map(({ incident }) => incident);
    result.push({ date: cursor.toString(), impact: worstImpact(dayIncidents), incidents: dayIncidents });
    cursor = cursor.add({ days: 1 });
  }
  return result;
}
