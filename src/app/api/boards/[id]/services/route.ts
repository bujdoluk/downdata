import { NextResponse } from "next/server";
import { resolveBoardById, addServiceToBoard } from "@/features/boards/services/boards";
import { resolveCatalogEntryBySlug, ensureCatalogEntry } from "@/lib/catalog";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await resolveBoardById(id))) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const bodySlug = typeof body?.slug === "string" ? body.slug.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const host = typeof body?.host === "string" ? body.host.trim() : "";

  let slug: string;
  if (bodySlug) {
    if (!(await resolveCatalogEntryBySlug(bodySlug))) {
      return NextResponse.json({ error: "Unknown service." }, { status: 400 });
    }
    slug = bodySlug;
  } else {
    if (!name || !host) {
      return NextResponse.json({ error: "Name and host are required." }, { status: 400 });
    }

    // Only Atlassian Statuspage feeds are readable by /api/status and /api/summary.
    try {
      const res = await fetch(`https://${host}/api/v2/status.json`, { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) {
        return NextResponse.json({ error: `That host didn't return a valid status page (HTTP ${res.status}).` }, { status: 400 });
      }
      const statusData = await res.json();
      if (!statusData?.status?.indicator) {
        return NextResponse.json({ error: "That host doesn't look like a Statuspage-based status page." }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Couldn't reach that host — check the domain and try again." }, { status: 400 });
    }

    slug = (await ensureCatalogEntry({ name, host })).slug;
  }

  return NextResponse.json(await addServiceToBoard(id, slug));
}
