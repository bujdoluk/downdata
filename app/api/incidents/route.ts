import { NextResponse } from "next/server";
import { getAllServices } from "@/lib/services";
import { getAllStoredIncidents, toIncidentApiShape } from "@/lib/getStoredIncident";
import type { TrackedIncident } from "@/types/service";

export async function GET() {
  const [services, incidents] = await Promise.all([getAllServices(), getAllStoredIncidents()]);
  const serviceBySlug = new Map(services.map((service) => [service.slug, service]));

  const results: TrackedIncident[] = incidents.flatMap((incident) => {
    const service = serviceBySlug.get(incident.service_slug);
    return service ? [{ ...toIncidentApiShape(incident), service }] : [];
  });

  return NextResponse.json({ incidents: results });
}
