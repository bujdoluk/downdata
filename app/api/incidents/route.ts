import { NextResponse } from "next/server";
import { getAllServices } from "@/lib/services";
import { getAllStoredIncidentSummaries, toIncidentSummaryApiShape } from "@/lib/getStoredIncident";
import type { TrackedIncidentSummary } from "@/types/service";

export async function GET() {
  const services = await getAllServices();
  const incidents = await getAllStoredIncidentSummaries(services.map((service) => service.slug));
  const serviceBySlug = new Map(services.map((service) => [service.slug, service]));

  const results: TrackedIncidentSummary[] = incidents.flatMap((incident) => {
    const service = serviceBySlug.get(incident.service_slug);
    return service ? [{ ...toIncidentSummaryApiShape(incident), service }] : [];
  });

  return NextResponse.json({ incidents: results });
}
