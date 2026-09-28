import { createClient } from "@/lib/supabase/server";

// Any row for (user, service) means "Custom"; no rows means "All components".
// One filter per service, not per integration. See docs/specs/SPEC-component-notification-filters.md.

export async function getComponentFilter(serviceSlug: string): Promise<string[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("service_component_filters").select("component_id").eq("service_slug", serviceSlug);
  if (error) throw error;
  return data.length > 0 ? data.map((row) => row.component_id) : null;
}

// Via an RPC so the replace is atomic; delete-then-insert would briefly read as "All components".
export async function setComponentFilter(serviceSlug: string, componentIds: string[]): Promise<void> {
  if (componentIds.length === 0) throw new Error("componentIds must be non-empty — use clearComponentFilter for \"All components\".");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_component_filter", { p_service_slug: serviceSlug, p_component_ids: componentIds });
  if (error) throw error;
}

export async function clearComponentFilter(serviceSlug: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("service_component_filters").delete().eq("service_slug", serviceSlug);
  if (error) throw error;
}
