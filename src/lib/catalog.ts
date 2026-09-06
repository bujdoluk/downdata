import { getSupabaseClient } from "@/lib/supabase";
import { slugify } from "@/lib/slugify";
import type { Catalog } from "@/types/service";

export async function getCatalog(): Promise<Catalog[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("catalog").select("slug, name, host, category").order("name");
  if (error) throw error;
  return data ?? [];
}

// Used only to confirm a slug is a real, known host (detail/history pages
// 404 otherwise) — never for ownership. catalog is public reference data,
// so this stays a plain lookup with no per-user scoping.
export async function resolveCatalogEntryBySlug(slug: string): Promise<Catalog | undefined> {
  const catalog = await getCatalog();
  return catalog.find((entry) => entry.slug === slug);
}

// Shared by /api/incidents and /api/maintenance to attach a full `service`
// object to each stored row they return, scoped to just the caller's own
// tracked slugs (not the whole catalog) — a Set lookup, not a repeated
// catalog.filter(...).includes(...) scan per entry.
export function buildTrackedServiceLookup(trackedSlugs: string[], catalog: Catalog[]): Map<string, Catalog> {
  const tracked = new Set(trackedSlugs);
  return new Map(catalog.filter((entry) => tracked.has(entry.slug)).map((entry) => [entry.slug, entry]));
}

// Ensures a host has a catalog entry, creating one if it's brand new —
// the "add a new website, not from the catalog" path of adding a service
// to a board (formerly lib/services.ts's addService, before tracking
// became board membership). Returns the existing entry if this host is
// already known, so the caller doesn't create a duplicate under a
// different slug.
export async function ensureCatalogEntry(input: { name: string; host: string }): Promise<Catalog> {
  const catalog = await getCatalog();
  const existing = catalog.find((entry) => entry.host === input.host);
  if (existing) return existing;

  const baseSlug = slugify(input.name) || "service";
  let slug = baseSlug;
  let suffix = 2;
  while (catalog.some((entry) => entry.slug === slug)) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const entry: Catalog = { slug, name: input.name.trim(), host: input.host.trim(), category: "other" };
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("catalog").insert({ slug: entry.slug, name: entry.name, host: entry.host });
  if (error) throw error;
  return entry;
}
