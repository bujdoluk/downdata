import { NextResponse } from "next/server";
import { resolveBoardById, cloneBoard } from "@/lib/boards";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await resolveBoardById(id))) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Board name is required." }, { status: 400 });
  }

  const board = await cloneBoard(id, name);
  return NextResponse.json(board, { status: 201 });
}
