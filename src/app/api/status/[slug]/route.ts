import { NextResponse } from "next/server";
import { resolveCatalogEntryBySlug } from "@/lib/catalog";
import { fetchStatusBatch } from "@/lib/statusBatch";

// Public, unauthenticated — one service's live status only (no incidents/
// maintenances/uptime), for the landing footer's Popular Services row
// badges. fetchStatusBatch already handles arrays of any size, so a
// single-service array works as-is rather than duplicating its logic.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await resolveCatalogEntryBySlug(slug);

  if (!service) {
    return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  }

  const result = await fetchStatusBatch([service]);
  return NextResponse.json(result[slug] ?? { error: "Failed to reach status API" });
}
