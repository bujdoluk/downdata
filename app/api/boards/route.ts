import { NextResponse } from "next/server";
import { getAllBoards, addBoard } from "@/lib/boards";

export async function GET() {
  return NextResponse.json(await getAllBoards());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Board name is required." }, { status: 400 });
  }

  const board = await addBoard(name);
  return NextResponse.json(board, { status: 201 });
}
