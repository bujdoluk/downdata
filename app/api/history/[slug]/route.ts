import { NextResponse } from "next/server";
import { resolveServiceBySlug } from "@/lib/services";
import { getStoredIncidentsForService, toIncidentApiShape } from "@/lib/getStoredIncident";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await resolveServiceBySlug(slug);

  if (!service) {
    return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  }

  const incidents = await getStoredIncidentsForService(slug);
  return NextResponse.json({ incidents: incidents.map(toIncidentApiShape) });
}
