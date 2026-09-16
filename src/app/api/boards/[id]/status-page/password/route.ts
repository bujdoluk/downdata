import { NextResponse } from "next/server";
import { resolveBoardById } from "@/features/boards/services/boards";
import { removePassword, setPassword } from "@/features/status-pages/services/statusPages";
import { firstIssueMessage, passwordSchema } from "@/features/status-pages/services/validation";

// Set or change the shared password — kept separate from PUT
// .../status-page (branding) and .../status-page/enable (publishing), same
// "one endpoint per distinct concern" split this feature already follows.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await resolveBoardById(id))) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const passwordResult = passwordSchema.safeParse(typeof body?.password === "string" ? body.password : "");
  if (!passwordResult.success) {
    return NextResponse.json({ error: firstIssueMessage(passwordResult) }, { status: 400 });
  }

  const statusPage = await setPassword(id, passwordResult.data);
  if (!statusPage) {
    return NextResponse.json({ error: "Set up a status page before protecting it." }, { status: 400 });
  }
  return NextResponse.json(statusPage);
}

// Turns password protection off entirely (the IP allowlist, if any, is
// untouched — the two mechanisms are independent, see the spec).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await resolveBoardById(id))) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const statusPage = await removePassword(id);
  if (!statusPage) {
    return NextResponse.json({ error: "Status page not found." }, { status: 404 });
  }
  return NextResponse.json(statusPage);
}
