import { NextResponse } from "next/server";
import { removeIntegration } from "@/lib/integrations";

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const removed = await removeIntegration(slug);

  if (!removed) {
    return NextResponse.json({ error: "Unknown integration" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
