import { NextResponse } from "next/server";
import { resolveBoardById } from "@/lib/boards";
import { getStatusPage, upsertStatusPage } from "@/lib/statusPages";

// Public URL slugs: lowercase letters/digits/hyphens, no leading/trailing/
// doubled hyphen, 3-63 chars — short enough to type, long enough to avoid
// trivial collisions. Matches lib/slugify.ts's own output shape, but
// validated independently since a user can edit the auto-suggested value.
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_LOGO_URL_LENGTH = 2048;
const MAX_COMPANY_NAME_LENGTH = 120;

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
  const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const companyNameRaw = typeof body?.companyName === "string" ? body.companyName.trim() : "";
  const logoUrl = typeof body?.logoUrl === "string" && body.logoUrl.trim() ? body.logoUrl.trim() : null;
  const hideBranding = body?.hideBranding === true;

  if (!SLUG_PATTERN.test(slug) || slug.length < 3 || slug.length > 63) {
    return NextResponse.json(
      { error: "The URL must be 3-63 characters, lowercase letters, numbers, and hyphens only." },
      { status: 400 },
    );
  }
  if (companyNameRaw.length > MAX_COMPANY_NAME_LENGTH) {
    return NextResponse.json({ error: "Company name is too long." }, { status: 400 });
  }
  if (logoUrl && logoUrl.length > MAX_LOGO_URL_LENGTH) {
    return NextResponse.json({ error: "Logo URL is too long." }, { status: 400 });
  }

  try {
    const statusPage = await upsertStatusPage(id, { slug, companyName: companyNameRaw || null, logoUrl, hideBranding });
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
