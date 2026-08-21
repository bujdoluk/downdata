import { NextResponse } from "next/server";
import { removeService } from "@/lib/services";

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const removed = await removeService(slug);

  if (!removed) {
    return NextResponse.json({ error: "Unknown service" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
