import { NextResponse } from "next/server";
import { resolveCatalogEntryBySlug } from "@/lib/catalog";
import { getStoredIncidentsForService, toIncidentApiShape } from "@/lib/getStoredIncident";
import { getAllStoredMaintenanceSummaries, toMaintenanceSummaryApiShape } from "@/lib/getStoredMaintenance";
import { getServiceUptimeSummary } from "@/lib/uptime";

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
    const [incidentRows, maintenanceRows, uptimeSummary] = await Promise.all([
      getStoredIncidentsForService(slug, { limit: 10 }),
      getAllStoredMaintenanceSummaries([slug]),
      getServiceUptimeSummary(slug),
    ]);
    const incidents = incidentRows.map(toIncidentApiShape);
    const maintenances = maintenanceRows.map(toMaintenanceSummaryApiShape);

    return NextResponse.json({
      ...data,
      incidents,
      maintenances,
      ...uptimeSummary,
      service,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach status API" },
      { status: 502 },
    );
  }
}
