import { NextResponse } from "next/server";
import { resolveBoardById } from "@/features/boards/services/boards";
import { getStatusPage, upsertStatusPage } from "@/features/status-pages/services/statusPages";
import { companyNameSchema, firstIssueMessage, slugSchema } from "@/features/status-pages/services/validation";

const MAX_LOGO_URL_LENGTH = 2048;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await resolveBoardById(id))) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  return NextResponse.json(await getStatusPage(id));
}

// Create-or-update the branding/slug settings. Never touches `enabled` —
// see POST/DELETE .../status-page/enable for publishing, kept separate so
// the quota check only runs at actual publish time.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await resolveBoardById(id))) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const logoUrl = typeof body?.logoUrl === "string" && body.logoUrl.trim() ? body.logoUrl.trim() : null;
  const hideBranding = body?.hideBranding === true;

  const slugResult = slugSchema.safeParse(typeof body?.slug === "string" ? body.slug : "");
  if (!slugResult.success) {
    return NextResponse.json({ error: firstIssueMessage(slugResult) }, { status: 400 });
  }
  const companyNameResult = companyNameSchema.safeParse(typeof body?.companyName === "string" ? body.companyName : "");
  if (!companyNameResult.success) {
    return NextResponse.json({ error: firstIssueMessage(companyNameResult) }, { status: 400 });
  }
  if (logoUrl && logoUrl.length > MAX_LOGO_URL_LENGTH) {
    return NextResponse.json({ error: "Logo URL is too long." }, { status: 400 });
  }

  const slug = slugResult.data;
  const companyName = companyNameResult.data;

  try {
    const statusPage = await upsertStatusPage(id, { slug, companyName: companyName || null, logoUrl, hideBranding });
    return NextResponse.json(statusPage);
  } catch (error) {
    // Postgres unique_violation on board_status_pages.slug — someone
    // else's status page (or this account's other one) already has it.
    if ((error as { code?: string })?.code === "23505") {
      return NextResponse.json({ error: "That URL is already taken. Try a different one." }, { status: 409 });
    }
    throw error;
  }
}
