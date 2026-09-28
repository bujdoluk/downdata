import { NextResponse } from "next/server";
import { resolveCatalogEntryBySlug } from "@/lib/catalog";
import { fetchStatusBatch } from "@/lib/statusBatch";

// Public: live status only, no account data.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await resolveCatalogEntryBySlug(slug);

  if (!service) {
    return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  }

  const result = await fetchStatusBatch([service]);
  return NextResponse.json(result[slug] ?? { error: "Failed to reach status API" });
}
