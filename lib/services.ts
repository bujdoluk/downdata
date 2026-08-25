import { getSupabaseClient } from "@/lib/supabase";
import type { ServiceDefinition } from "@/types/service";
import { getCatalog } from "@/lib/catalog";

export async function getAllServices(): Promise<ServiceDefinition[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("services").select("slug, name, host").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function resolveServiceBySlug(slug: string): Promise<ServiceDefinition | undefined> {
  const services = await getAllServices();
  const tracked = services.find((service) => service.slug === slug);
  if (tracked) return tracked;
  const catalog = await getCatalog();
  return catalog.find((entry) => entry.slug === slug);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function addService(input: { name: string; host: string }): Promise<ServiceDefinition> {
  const services = await getAllServices();
  const catalog = await getCatalog();
  // Reuse the catalog's slug for this host when one exists, so a tracked
  // service's slug always matches its catalog entry — otherwise the two
  // tables drift apart (e.g. "Bunny.net" slugifies to "bunny-net" here but
  // the catalog seed used "bunny") and delete-by-slug 404s forever because
  // it's looking up the wrong row.
  const catalogMatch = catalog.find((entry) => entry.host === input.host);
  const baseSlug = catalogMatch?.slug || slugify(input.name) || "service";

  let slug = baseSlug;
  let suffix = 2;
  while (services.some((service) => service.slug === slug)) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const service: ServiceDefinition = { slug, name: input.name.trim(), host: input.host.trim() };
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("services").insert(service);
  if (error) throw error;

  // Best-effort: the service is already tracked at this point (the insert
  // above succeeded) — a catalog-membership hiccup (e.g. a host uniqueness
  // collision with a different slug already in the catalog) shouldn't fail
  // the whole tracking flow the user is waiting on. Logged, not thrown: the
  // catalog poller just won't pick this host up until it's fixed.
  const { error: catalogError } = await supabase
    .from("catalog")
    .upsert({ slug: service.slug, name: service.name, host: service.host }, { onConflict: "slug", ignoreDuplicates: true });
  if (catalogError) console.error(`addService: failed to add "${service.slug}" to catalog:`, catalogError);

  return service;
}

export async function removeService(slug: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("services").delete().eq("slug", slug).select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
