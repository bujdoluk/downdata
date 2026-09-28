import { NextResponse } from "next/server";
import { getPublicStatusPage, resolveStatusPageAccess } from "@/features/status-pages/services/statusPages";

// Public. Repeats the page's unlock check, or a protected page's data would be fetchable by URL
// (docs/specs/SPEC-status-page-password.md).
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { protection, unlocked } = await resolveStatusPageAccess(slug, request.headers);
  if (!protection) {
    return NextResponse.json({ error: "Status page not found." }, { status: 404 });
  }
  if (!unlocked) {
    return NextResponse.json({ error: "This status page is password protected." }, { status: 401 });
  }

  const statusPage = await getPublicStatusPage(slug);
  if (!statusPage) {
    return NextResponse.json({ error: "Status page not found." }, { status: 404 });
  }

  return NextResponse.json(statusPage);
}
