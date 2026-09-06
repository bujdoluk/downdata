import { NextResponse } from "next/server";
import { resolveCatalogEntryBySlug } from "@/lib/catalog";
import { getStoredMaintenanceWithUpdates, toMaintenanceApiShape } from "@/lib/getStoredMaintenance";

// One maintenance's full timeline, fetched on demand for whichever item the
// Maintenance/Boards pages currently have selected — the list endpoint
// (/api/maintenance) deliberately doesn't include the update timeline.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const service = await resolveCatalogEntryBySlug(slug);
  if (!service) {
    return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  }

  const maintenance = await getStoredMaintenanceWithUpdates(slug, id);
  if (!maintenance) {
    return NextResponse.json({ error: "Unknown maintenance" }, { status: 404 });
  }

  return NextResponse.json({ ...toMaintenanceApiShape(maintenance), service });
}
