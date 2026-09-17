import { NextResponse } from "next/server";
import { getComponentFilter, setComponentFilter, clearComponentFilter } from "@/features/monitors/services/componentFilter";
import { resolveCatalogEntryBySlug } from "@/lib/catalog";
import { matchesComponentPrefix } from "@/lib/componentNamePrefix";
import type { StatuspageComponent } from "@/types/service";

async function fetchValidComponentIds(serviceSlug: string): Promise<Set<string> | null> {
  const service = await resolveCatalogEntryBySlug(serviceSlug);
  if (!service) return null;

  try {
    // 8s timeout, matching pollIncidents.ts's own host-fetch pattern — this
    // is a live, interactive PUT request (not a background poll), so a
    // slow/hanging host must fail fast rather than stall it indefinitely.
    const res = await fetch(`https://${service.host}/api/v2/components.json`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { components?: StatuspageComponent[] };
    const components = (data.components ?? []).filter(
      (c) => !c.group && (!service.componentNamePrefix || matchesComponentPrefix(c.name, service.componentNamePrefix)),
    );
    return new Set(components.map((c) => c.id));
  } catch {
    // A network error/timeout previously threw out of this function
    // uncaught (the PUT handler below has no try/catch of its own) — now
    // it's treated the same as any other "couldn't verify" outcome.
    return null;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const componentIds = await getComponentFilter(slug);
  return NextResponse.json({ componentIds });
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawComponentIds = (body as { componentIds?: unknown })?.componentIds;
  if (!Array.isArray(rawComponentIds) || rawComponentIds.length === 0 || !rawComponentIds.every((id): id is string => typeof id === "string")) {
    return NextResponse.json({ error: "Choose at least one component to notify on." }, { status: 400 });
  }
  // Deduped before it ever reaches the DB — the client (a Set-backed
  // checklist) can't produce a duplicate today, but this route has no way
  // to know that about every possible caller. A duplicate here would
  // otherwise hit service_component_filters' own primary key
  // (user_id, service_slug, component_id) inside the insert half of
  // set_component_filter()'s delete+reinsert, and setComponentFilter's
  // resulting throw needs to become this app's usual {error} envelope, not
  // an unhandled exception — see the try/catch below.
  const componentIds = [...new Set(rawComponentIds)];

  const validIds = await fetchValidComponentIds(slug);
  if (!validIds) {
    return NextResponse.json({ error: "Couldn't verify this service's components right now — try again shortly." }, { status: 502 });
  }
  const unknownIds = componentIds.filter((id) => !validIds.has(id));
  if (unknownIds.length > 0) {
    return NextResponse.json({ error: "One or more selected components no longer exist for this service." }, { status: 400 });
  }

  try {
    await setComponentFilter(slug, componentIds);
  } catch {
    return NextResponse.json({ error: "Couldn't save your component selection. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ componentIds });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await clearComponentFilter(slug);
  return NextResponse.json({ componentIds: null });
}
