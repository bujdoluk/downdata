import { NextResponse } from "next/server";
import { resolveCatalogEntryBySlug } from "@/lib/catalog";
import { getStoredIncidentWithUpdates, toIncidentApiShape } from "@/lib/getStoredIncident";

// Fetched on demand: the list endpoint deliberately omits incident_updates.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const service = await resolveCatalogEntryBySlug(slug);
  if (!service) {
    return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  }

  const incident = await getStoredIncidentWithUpdates(slug, id);
  if (!incident) {
    return NextResponse.json({ error: "Unknown incident" }, { status: 404 });
  }

  return NextResponse.json({ ...toIncidentApiShape(incident), service });
}
