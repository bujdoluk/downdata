import { NextResponse } from "next/server";
import { resolveBoardById } from "@/features/boards/services/boards";
import { setAllowedIps } from "@/features/status-pages/services/statusPages";
import { allowedIpsSchema, firstAllowedIpsIssueMessage } from "@/features/status-pages/services/validation";

// Replaces the whole allowlist — same "the client sends the full desired
// list" shape as a plain array setting elsewhere in this app
// (boards.service_slugs), not an incremental add/remove endpoint.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await resolveBoardById(id))) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const rawEntries: unknown = body?.allowedIps;
  if (!Array.isArray(rawEntries) || !rawEntries.every((entry): entry is string => typeof entry === "string")) {
    return NextResponse.json({ error: "allowedIps must be a list of IP addresses." }, { status: 400 });
  }
  const result = allowedIpsSchema.safeParse(rawEntries);
  if (!result.success) {
    return NextResponse.json({ error: firstAllowedIpsIssueMessage(result, rawEntries) }, { status: 400 });
  }

  const statusPage = await setAllowedIps(id, result.data);
  if (!statusPage) {
    return NextResponse.json({ error: "Set up a status page before configuring an allowlist." }, { status: 400 });
  }
  return NextResponse.json(statusPage);
}
