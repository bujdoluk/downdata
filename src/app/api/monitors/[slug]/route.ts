import { NextResponse } from "next/server";
import { removeServiceFromAllBoards } from "@/lib/boards";

// Untrack from every one of the caller's own boards at once — the
// /monitors aggregate view's remove action. Untracking from just one
// specific board is a separate, already-existing action: DELETE
// /api/boards/[id]/services/[slug], from that board's own page.
export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await removeServiceFromAllBoards(slug);
  return new NextResponse(null, { status: 204 });
}
