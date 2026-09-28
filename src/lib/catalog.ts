import { cache } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { slugify } from "@/lib/slugify";
import type { Catalog } from "@/types/service";

type CatalogRow = { slug: string; name: string; host: string; category: string; component_name_prefix: string | null };

const SELECT_COLUMNS = "slug, name, host, category, component_name_prefix";

function toCatalog(row: CatalogRow): Catalog {
  return {
    slug: row.slug,
    name: row.name,
    host: row.host,
    category: row.category as Catalog["category"],
    componentNamePrefix: row.component_name_prefix ?? undefined,
  };
}

export async function getCatalog(): Promise<Catalog[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("catalog").select(SELECT_COLUMNS).order("name");
  if (error) throw error;
  return ((data ?? []) as CatalogRow[]).map(toCatalog);
}

// cache() dedupes the generateMetadata + page calls within one render.
export const resolveCatalogEntryBySlug = cache(async (slug: string): Promise<Catalog | undefined> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("catalog").select(SELECT_COLUMNS).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? toCatalog(data as CatalogRow) : undefined;
});

export function buildTrackedServiceLookup(trackedSlugs: string[], catalog: Catalog[]): Map<string, Catalog> {
  const tracked = new Set(trackedSlugs);
  return new Map(catalog.filter((entry) => tracked.has(entry.slug)).map((entry) => [entry.slug, entry]));
}

// Returns the existing entry for a known host so it isn't duplicated under another slug.
export async function ensureCatalogEntry(input: { name: string; host: string }): Promise<Catalog> {
  const catalog = await getCatalog();
  // Hostnames are case-insensitive; === created duplicate rows.
  const inputHost = input.host.trim().toLowerCase();
  const existing = catalog.find((entry) => entry.host.toLowerCase() === inputHost);
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
