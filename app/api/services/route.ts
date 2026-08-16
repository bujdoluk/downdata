import { NextResponse } from "next/server";
import { getAllServices, addService } from "@/lib/services";

export async function GET() {
  return NextResponse.json(getAllServices());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const host = typeof body?.host === "string" ? body.host.trim() : "";

  if (!name || !host) {
    return NextResponse.json({ error: "Name and host are required." }, { status: 400 });
  }

  // Light validation: make sure this actually looks like an Atlassian
  // Statuspage-based status page before we start tracking it — that's
  // the only shape /api/status and /api/summary know how to read.
  try {
    const res = await fetch(`https://${host}/api/v2/status.json`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `That host didn't return a valid status page (HTTP ${res.status}).` },
        { status: 400 },
      );
    }
    const data = await res.json();
    if (!data?.status?.indicator) {
      return NextResponse.json(
        { error: "That host doesn't look like a Statuspage-based status page." },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach that host — check the domain and try again." },
      { status: 400 },
    );
  }

  const service = addService({ name, host });
  return NextResponse.json(service, { status: 201 });
}
