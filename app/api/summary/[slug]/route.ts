import { NextResponse } from "next/server";
import { resolveServiceBySlug } from "@/lib/services";
import { getStoredIncidentsForService, toIncidentApiShape } from "@/lib/getStoredIncident";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await resolveServiceBySlug(slug);

  if (!service) {
    return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  }

  try {
    // status/components have no DB equivalent — still live. incidents does,
    // and is replaced below with the stored copy.
    const res = await fetch(`https://${service.host}/api/v2/summary.json`, { next: { revalidate: 60 } });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const incidents = (await getStoredIncidentsForService(slug)).map(toIncidentApiShape);
    return NextResponse.json({ ...data, incidents, service });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach status API" },
      { status: 502 },
    );
  }
}
