import { NextResponse } from "next/server";
import { getPublicStatusPage } from "@/lib/statusPages";

// Public, unauthenticated — no session read here at all (unlike every
// other route under app/api/, see proxy.ts). Powers both app/status/
// [slug]/page.tsx's initial render and its client-side 60s poll.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const statusPage = await getPublicStatusPage(slug);
  if (!statusPage) {
    return NextResponse.json({ error: "Status page not found." }, { status: 404 });
  }

  return NextResponse.json(statusPage);
}
