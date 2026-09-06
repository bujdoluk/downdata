import { NextResponse } from "next/server";
import { resolveIntegrationBySlug, removeRecipient } from "@/lib/integrations";

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string; value: string }> }) {
  const { slug, value } = await params;
  const integration = await resolveIntegrationBySlug(slug);
  if (!integration) {
    return NextResponse.json({ error: "Unknown integration" }, { status: 404 });
  }

  const removed = await removeRecipient(integration.id, value);
  if (!removed) {
    return NextResponse.json({ error: "Unknown recipient" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
