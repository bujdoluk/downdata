import { NextResponse } from "next/server";
import { resolveCatalogEntryBySlug } from "@/lib/catalog";
import { getStoredIncidentsForService, getStoredIncidentSummariesForService, toIncidentApiShape, toIncidentSummaryApiShape } from "@/lib/getStoredIncident";
import { getAllStoredMaintenanceSummaries, toMaintenanceSummaryApiShape } from "@/lib/getStoredMaintenance";
import { isoDaysAgo } from "@/lib/formatTime";

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
    const [incidentRows, maintenanceRows, last30DaysRows] = await Promise.all([
      getStoredIncidentsForService(slug, { limit: 10 }),
      getAllStoredMaintenanceSummaries([slug]),
      getStoredIncidentSummariesForService(slug, isoDaysAgo(OUTAGE_TRACKER_DAYS)),
    ]);
    const incidents = incidentRows.map(toIncidentApiShape);
    const maintenances = maintenanceRows.map(toMaintenanceSummaryApiShape);
    const last30DaysIncidents = last30DaysRows.map(toIncidentSummaryApiShape);
    return NextResponse.json({ ...data, incidents, maintenances, last30DaysIncidents, service });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach status API" },
      { status: 502 },
    );
  }
}
