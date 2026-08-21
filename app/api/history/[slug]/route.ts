import { NextResponse } from "next/server";
import { resolveServiceBySlug } from "@/lib/services";
import type { StatuspageIncident } from "@/types/service";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await resolveServiceBySlug(slug);

  if (!service) {
    return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  }

  try {
    const res = await fetch(`https://${service.host}/api/v2/incidents.json`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ incidents: data.incidents as StatuspageIncident[] });
  } catch {
    return NextResponse.json({ error: "Failed to reach status API" }, { status: 502 });
  }
}
