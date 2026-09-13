import { NextResponse } from "next/server";
import { resolveCatalogEntryBySlug } from "@/lib/catalog";
import { getStoredIncidentsForService, toIncidentApiShape } from "@/lib/getStoredIncident";
import { getAllTimeUptimeStats } from "@/lib/uptime";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await resolveCatalogEntryBySlug(slug);

  if (!service) {
    return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  }

  const [incidents, uptimeStats] = await Promise.all([
    getStoredIncidentsForService(slug, { includeComponents: true }),
    getAllTimeUptimeStats(slug),
  ]);

  return NextResponse.json({
    incidents: incidents.map(toIncidentApiShape),
    trackedSince: uptimeStats?.trackedSince ?? null,
    officialAllTimeUptime: uptimeStats?.officialAllTimeUptime ?? null,
  });
}
