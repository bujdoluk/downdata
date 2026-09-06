import { NextResponse } from "next/server";
import { resolveIntegrationBySlug, addServiceToIntegrationTarget, removeServiceFromIntegrationTarget } from "@/lib/integrations";
import { getAllTrackedSlugs } from "@/lib/boards";

// Turns this service on as a trigger for the caller's own integration —
// mirrors app/api/boards/[id]/services/[slug]'s add/remove shape exactly.
export async function POST(_request: Request, { params }: { params: Promise<{ slug: string; serviceSlug: string }> }) {
  const { slug, serviceSlug } = await params;
  // Independent of each other (different tables, neither depends on the
  // other's result) — resolve both at once instead of sequentially.
  const [integration, trackedSlugs] = await Promise.all([resolveIntegrationBySlug(slug), getAllTrackedSlugs()]);
  if (!integration) {
    return NextResponse.json({ error: "Unknown integration" }, { status: 404 });
  }
  if (!trackedSlugs.includes(serviceSlug)) {
    return NextResponse.json({ error: "That service isn't tracked yet." }, { status: 400 });
  }

  await addServiceToIntegrationTarget(integration.id, serviceSlug);
  return NextResponse.json({ serviceSlug, enabled: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string; serviceSlug: string }> }) {
  const { slug, serviceSlug } = await params;
  const integration = await resolveIntegrationBySlug(slug);
  if (!integration) {
    return NextResponse.json({ error: "Unknown integration" }, { status: 404 });
  }

  await removeServiceFromIntegrationTarget(integration.id, serviceSlug);
  return NextResponse.json({ serviceSlug, enabled: false });
}
