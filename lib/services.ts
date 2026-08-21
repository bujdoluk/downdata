import { getSupabaseClient } from "@/lib/supabase";
import type { ServiceDefinition } from "@/types/service";
import { SERVICE_CATALOG } from "@/lib/serviceCatalog";

export async function getAllServices(): Promise<ServiceDefinition[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("services").select("slug, name, host").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function resolveServiceBySlug(slug: string): Promise<ServiceDefinition | undefined> {
  const services = await getAllServices();
  return services.find((service) => service.slug === slug) ?? SERVICE_CATALOG.find((entry) => entry.slug === slug);
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
  const baseSlug = slugify(input.name) || "service";

  let slug = baseSlug;
  let suffix = 2;
  while (services.some((service) => service.slug === slug)) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const service: ServiceDefinition = { slug, name: input.name.trim(), host: input.host.trim() };
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("services").insert(service);
  if (error) throw error;
  return service;
}

export async function removeService(slug: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("services").delete().eq("slug", slug).select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
