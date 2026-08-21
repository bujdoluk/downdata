import { NextResponse } from "next/server";
import { getAllServices } from "@/lib/services";
import type { StatuspageIncident, TrackedIncident } from "@/types/service";

export async function GET() {
  const services = await getAllServices();

  const results = await Promise.all(
    services.map(async (service): Promise<TrackedIncident[]> => {
      try {
        const res = await fetch(`https://${service.host}/api/v2/incidents.json`, { next: { revalidate: 300 } });
        if (!res.ok) return [];

        const data = await res.json();
        return (data.incidents as StatuspageIncident[]).map((incident) => ({ ...incident, service }));
      } catch {
        return [];
      }
    }),
  );

  const incidents = results.flat().sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));

  return NextResponse.json({ incidents });
}
