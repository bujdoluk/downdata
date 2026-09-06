import { NextResponse } from "next/server";
import { getAllBoards, resolveBoardById, renameBoard, removeBoard } from "@/lib/boards";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await resolveBoardById(id))) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Board name is required." }, { status: 400 });
  }

  return NextResponse.json(await renameBoard(id, name));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if ((await getAllBoards()).length <= 1) {
    return NextResponse.json({ error: "You need at least one board." }, { status: 400 });
  }

  if (!(await removeBoard(id))) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
