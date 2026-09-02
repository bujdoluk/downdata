import type { Slug, StatuspageIncidentSummary } from "@/types/service";
import { getSupabaseClient } from "@/lib/supabase";
import { epochMs, nowIso } from "@/lib/formatTime";

export type UptimeStats = { trackedSince: string; officialAllTimeUptime: number };

type UptimeStatsRow = { tracked_since: string; total_downtime_seconds: number; open_incident_seconds: number };

function clampPercent(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
}

// Only major/critical count as an "official" outage toward uptime — minor
// is degraded performance, not downtime (matches statusStyles.ts's own
// "Minor Issues" vs "Outage" labeling). Mirrored in the SQL trigger (see
// supabase/migrations/0024_service_uptime_stats.sql) for the all-time
// figure — keep both in sync if this list ever changes.
const OUTAGE_IMPACTS = new Set(["major", "critical"]);

// All-time uptime since this service's first successful poll
// (polled_services.first_polled_at) — a single indexed read via
// get_uptime_stats() (see supabase/migrations/0024_service_uptime_stats.sql),
// not an aggregate over the service's whole incident history. null when the
// service has no polled_services row yet (still on its very first poll).
export async function getAllTimeUptimeStats(slug: Slug): Promise<UptimeStats | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.rpc("get_uptime_stats", { p_service_slug: slug });
  const row = (data as UptimeStatsRow[] | null)?.[0];
  if (!row) return null;

  const windowSeconds = (epochMs(nowIso()) - epochMs(row.tracked_since)) / 1000;
  if (windowSeconds <= 0) return { trackedSince: row.tracked_since, officialAllTimeUptime: 100 };

  const downtimeSeconds = row.total_downtime_seconds + row.open_incident_seconds;
  return {
    trackedSince: row.tracked_since,
    officialAllTimeUptime: clampPercent((1 - downtimeSeconds / windowSeconds) * 100),
  };
}

// Exact (unlike the trigger's overlap-approximate all-time total) 30-day
// uptime, computed from the same last30DaysIncidents rows already fetched
// for OutageTracker — no new query. Merges overlapping incident intervals
// before summing so two concurrent incidents don't double-count their
// shared downtime; cheap at 30-day scale, unlike doing this per poll cycle
// over a service's full history (see the migration's own trade-off note).
export function computeOfficial30DaysUptime(
  incidents: StatuspageIncidentSummary[],
  windowStartIso: string,
  windowEndIso: string,
): number {
  const windowStart = epochMs(windowStartIso);
  const windowEnd = epochMs(windowEndIso);
  const windowMs = windowEnd - windowStart;
  if (windowMs <= 0) return 100;

  const intervals = incidents
    .filter((incident) => OUTAGE_IMPACTS.has(incident.impact))
    .map((incident) => ({
      start: Math.max(epochMs(incident.created_at), windowStart),
      end: Math.min(incident.resolved_at ? epochMs(incident.resolved_at) : windowEnd, windowEnd),
    }))
    .filter((interval) => interval.end > interval.start)
    .sort((a, b) => a.start - b.start);

  let downtimeMs = 0;
  let mergedEnd = -Infinity;
  for (const interval of intervals) {
    const start = Math.max(interval.start, mergedEnd);
    if (interval.end > start) downtimeMs += interval.end - start;
    mergedEnd = Math.max(mergedEnd, interval.end);
  }

  return clampPercent((1 - downtimeMs / windowMs) * 100);
}
