import { NextResponse } from "next/server";
import { resolveBoardById, addServiceToBoard } from "@/lib/boards";
import { resolveServiceBySlug } from "@/lib/services";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await resolveBoardById(id))) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";

  if (!slug || !(await resolveServiceBySlug(slug))) {
    return NextResponse.json({ error: "That service isn't tracked yet." }, { status: 400 });
  }

  return NextResponse.json(await addServiceToBoard(id, slug));
}
