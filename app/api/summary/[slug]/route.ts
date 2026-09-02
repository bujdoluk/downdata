import { NextResponse } from "next/server";
import { resolveCatalogEntryBySlug } from "@/lib/catalog";
import { getStoredIncidentsForService, getStoredIncidentSummariesForService, toIncidentApiShape, toIncidentSummaryApiShape } from "@/lib/getStoredIncident";
import { getAllStoredMaintenanceSummaries, toMaintenanceSummaryApiShape } from "@/lib/getStoredMaintenance";
import { getAllTimeUptimeStats, computeOfficial30DaysUptime } from "@/lib/uptime";
import { isoDaysAgo, nowIso, epochMs } from "@/lib/formatTime";

const OUTAGE_TRACKER_DAYS = 30;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await resolveCatalogEntryBySlug(slug);

  if (!service) {
    return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  }

  try {
    const res = await fetch(`https://${service.host}/api/v2/summary.json`, { next: { revalidate: 60 } });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    // Fixed 30-day window — always used for fetching stored incidents (A),
    // so the tracker chart gets the full grid regardless of trackedSince.
    const windowStart = isoDaysAgo(OUTAGE_TRACKER_DAYS);
    const [incidentRows, maintenanceRows, last30DaysRows, uptimeStats] = await Promise.all([
      getStoredIncidentsForService(slug, { limit: 10 }),
      getAllStoredMaintenanceSummaries([slug]),
      getStoredIncidentSummariesForService(slug, windowStart),
      getAllTimeUptimeStats(slug),
    ]);
    const incidents = incidentRows.map(toIncidentApiShape);
    const maintenances = maintenanceRows.map(toMaintenanceSummaryApiShape);
    const last30DaysIncidents = last30DaysRows.map(toIncidentSummaryApiShape);

    // (B) the uptime percentage's own window is clipped to trackedSince
    // when tracking started less than 30 days ago — otherwise a
    // newly-tracked service would divide by 30 days it was never actually
    // observed for. Compared via epochMs(), not raw string comparison:
    // windowStart/nowIso() are this app's own fixed-format Temporal
    // output, but trackedSince comes back from Postgres/PostgREST in
    // whatever timestamptz string shape that layer returns, which isn't
    // guaranteed byte-comparable to the other two.
    const now = nowIso();
    const effectiveWindowStart =
      uptimeStats?.trackedSince && epochMs(uptimeStats.trackedSince) > epochMs(windowStart)
        ? uptimeStats.trackedSince
        : windowStart;
    const official30daysUptime = computeOfficial30DaysUptime(last30DaysIncidents, effectiveWindowStart, now);
    const uptimeWindowDays = Math.max(1, Math.round((epochMs(now) - epochMs(effectiveWindowStart)) / 86_400_000));

    return NextResponse.json({
      ...data,
      incidents,
      maintenances,
      last30DaysIncidents,
      official30daysUptime,
      uptimeWindowDays,
      officialAllTimeUptime: uptimeStats?.officialAllTimeUptime ?? null,
      trackedSince: uptimeStats?.trackedSince ?? null,
      service,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach status API" },
      { status: 502 },
    );
  }
}
