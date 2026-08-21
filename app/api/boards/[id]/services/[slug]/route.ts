import { NextResponse } from "next/server";
import { resolveBoardById, removeServiceFromBoard } from "@/lib/boards";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; slug: string }> }) {
  const { id, slug } = await params;
  if (!(await resolveBoardById(id))) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  return NextResponse.json(await removeServiceFromBoard(id, slug));
}
