import { NextResponse } from "next/server";
import { getPublicStatusPage, resolveStatusPageAccess } from "@/features/status-pages/services/statusPages";

// Public, unauthenticated — no session read here at all (unlike every
// other route under app/api/, see proxy.ts). Powers both app/status/
// [slug]/page.tsx's initial render and its client-side 60s poll — the same
// isStatusPageUnlocked() check that page applies server-side on first
// render has to be repeated here too, or a protected page's data would
// still be fetchable directly by URL, bypassing the password/allowlist
// gate entirely (see docs/specs/SPEC-status-page-password.md).
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
