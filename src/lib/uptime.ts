import type { Slug, StatuspageIncidentSummary } from "@/types/service";
import { getSupabaseClient } from "@/lib/supabase";
import { epochMs, nowIso, isoDaysAgo } from "@/lib/formatTime";
import { getStoredIncidentSummariesForService, toIncidentSummaryApiShape } from "@/lib/getStoredIncident";

export type UptimeStats = { trackedSince: string; officialAllTimeUptime: number };

type UptimeStatsRow = { tracked_since: string; total_downtime_seconds: number; open_incident_seconds: number };

function clampPercent(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
}

// Minor is degradation, not downtime. Keep in sync with the SQL trigger (migration 0024).
export const OUTAGE_IMPACTS = new Set(["major", "critical"]);

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

// Merges overlapping intervals so concurrent incidents don't double-count (the all-time trigger only approximates this).
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

const OUTAGE_TRACKER_DAYS = 30;

export type ServiceUptimeSummary = {
  last30DaysIncidents: StatuspageIncidentSummary[];
  trackedSince: string | null;
  official30daysUptime: number;
  uptimeWindowDays: number;
  officialAllTimeUptime: number | null;
};

export async function getServiceUptimeSummary(slug: Slug): Promise<ServiceUptimeSummary> {
  // Always the full 30 days so the tracker chart grid is complete regardless of trackedSince.
  const windowStart = isoDaysAgo(OUTAGE_TRACKER_DAYS);
  const [last30DaysRows, uptimeStats] = await Promise.all([
    getStoredIncidentSummariesForService(slug, windowStart),
    getAllTimeUptimeStats(slug),
  ]);
  const last30DaysIncidents = last30DaysRows.map(toIncidentSummaryApiShape);

  // Clipped to trackedSince so new services aren't divided by unobserved days.
  // epochMs, not string compare: Postgres timestamptz strings aren't byte-comparable to Temporal output.
  const now = nowIso();
  const effectiveWindowStart =
    uptimeStats?.trackedSince && epochMs(uptimeStats.trackedSince) > epochMs(windowStart) ? uptimeStats.trackedSince : windowStart;
  const official30daysUptime = computeOfficial30DaysUptime(last30DaysIncidents, effectiveWindowStart, now);
  const uptimeWindowDays = Math.max(1, Math.round((epochMs(now) - epochMs(effectiveWindowStart)) / 86_400_000));

  return {
    last30DaysIncidents,
    trackedSince: uptimeStats?.trackedSince ?? null,
    official30daysUptime,
    uptimeWindowDays,
    officialAllTimeUptime: uptimeStats?.officialAllTimeUptime ?? null,
  };
}
