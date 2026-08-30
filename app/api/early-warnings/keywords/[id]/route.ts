import { NextResponse } from "next/server";
import { removeKeywordWatch } from "@/lib/earlyWarnings";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const removed = await removeKeywordWatch(id);
  if (!removed) {
    return NextResponse.json({ error: "Unknown keyword" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
