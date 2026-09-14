import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { resolveBoardById } from "@/features/boards/services/boards";
import { setAllowedIps } from "@/features/status-pages/services/statusPages";

const MAX_ALLOWED_IPS = 20;

// Replaces the whole allowlist — same "the client sends the full desired
// list" shape as a plain array setting elsewhere in this app
// (boards.service_slugs), not an incremental add/remove endpoint.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await resolveBoardById(id))) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const allowedIps: unknown = body?.allowedIps;
  if (!Array.isArray(allowedIps) || !allowedIps.every((entry): entry is string => typeof entry === "string")) {
    return NextResponse.json({ error: "allowedIps must be a list of IP addresses." }, { status: 400 });
  }
  if (allowedIps.length > MAX_ALLOWED_IPS) {
    return NextResponse.json({ error: `You can add at most ${MAX_ALLOWED_IPS} IP addresses.` }, { status: 400 });
  }
  // isIP() (node:net) accepts exact IPv4/IPv6 addresses only — no CIDR
  // ranges in V1, see docs/specs/SPEC-status-page-password.md.
  const invalid = allowedIps.find((entry) => isIP(entry) === 0);
  if (invalid) {
    return NextResponse.json({ error: `"${invalid}" isn't a valid IP address. CIDR ranges aren't supported yet.` }, { status: 400 });
  }

  const statusPage = await setAllowedIps(id, allowedIps);
  if (!statusPage) {
    return NextResponse.json({ error: "Set up a status page before configuring an allowlist." }, { status: 400 });
  }
  return NextResponse.json(statusPage);
}
