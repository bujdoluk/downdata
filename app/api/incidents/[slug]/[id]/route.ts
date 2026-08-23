import { NextResponse } from "next/server";
import { resolveServiceBySlug } from "@/lib/services";
import { getStoredIncidentWithUpdates, toIncidentApiShape } from "@/lib/getStoredIncident";

// One incident's full timeline, fetched on demand for whichever item the
// Incidents/Boards pages currently have selected — the list endpoint
// (/api/incidents) deliberately doesn't include incident_updates.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const service = await resolveServiceBySlug(slug);
  if (!service) {
    return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  }

  const incident = await getStoredIncidentWithUpdates(slug, id);
  if (!incident) {
    return NextResponse.json({ error: "Unknown incident" }, { status: 404 });
  }

  return NextResponse.json({ ...toIncidentApiShape(incident), service });
}
