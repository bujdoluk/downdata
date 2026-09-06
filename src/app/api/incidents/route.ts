import { NextResponse } from "next/server";
import { getAllTrackedSlugs } from "@/lib/boards";
import { getCatalog, buildTrackedServiceLookup } from "@/lib/catalog";
import { getAllStoredIncidentSummaries, toIncidentSummaryApiShape } from "@/lib/getStoredIncident";
import type { TrackedIncidentSummary } from "@/types/service";

export async function GET() {
  const [trackedSlugs, catalog] = await Promise.all([getAllTrackedSlugs(), getCatalog()]);
  const incidents = await getAllStoredIncidentSummaries(trackedSlugs);
  const serviceBySlug = buildTrackedServiceLookup(trackedSlugs, catalog);

  const results: TrackedIncidentSummary[] = incidents.flatMap((incident) => {
    const service = serviceBySlug.get(incident.service_slug);
    return service ? [{ ...toIncidentSummaryApiShape(incident), service }] : [];
  });

  return NextResponse.json({ incidents: results });
}
