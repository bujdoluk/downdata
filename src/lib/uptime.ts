import type { Slug, StatuspageIncidentSummary } from "@/types/service";
import { getSupabaseClient } from "@/lib/supabase";
import { epochMs, nowIso, isoDaysAgo } from "@/lib/formatTime";
import { getStoredIncidentSummariesForService, toIncidentSummaryApiShape } from "@/lib/getStoredIncident";

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

const OUTAGE_TRACKER_DAYS = 30;

export type ServiceUptimeSummary = {
  last30DaysIncidents: StatuspageIncidentSummary[];
  trackedSince: string | null;
  official30daysUptime: number;
  uptimeWindowDays: number;
  officialAllTimeUptime: number | null;
};

// The one-service uptime/incident bundle — originally inline in
// app/api/summary/[slug]/route.ts, factored out here so the public status
// page route (one board's worth of services, not just one) can compute the
// same figures per service without duplicating the trackedSince-clipping
// logic in (B) below.
export async function getServiceUptimeSummary(slug: Slug): Promise<ServiceUptimeSummary> {
  // Fixed 30-day window — always used for fetching stored incidents, so
  // the tracker chart gets the full grid regardless of trackedSince.
  const windowStart = isoDaysAgo(OUTAGE_TRACKER_DAYS);
  const [last30DaysRows, uptimeStats] = await Promise.all([
    getStoredIncidentSummariesForService(slug, windowStart),
    getAllTimeUptimeStats(slug),
  ]);
  const last30DaysIncidents = last30DaysRows.map(toIncidentSummaryApiShape);

  // (B) the uptime percentage's own window is clipped to trackedSince when
  // tracking started less than 30 days ago — otherwise a newly-tracked
  // service would divide by 30 days it was never actually observed for.
  // Compared via epochMs(), not raw string comparison: windowStart/nowIso()
  // are this app's own fixed-format Temporal output, but trackedSince comes
  // back from Postgres/PostgREST in whatever timestamptz string shape that
  // layer returns, which isn't guaranteed byte-comparable to the other two.
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
