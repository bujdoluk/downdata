import { createClient } from "@/lib/supabase/server";

// --- Per-service component allowlist ("Custom" mode) -------------------
//
// See docs/specs/SPEC-component-notification-filters.md. One shared filter
// per (account, service) — not per integration; every connected
// integration that would otherwise notify for this service respects it
// uniformly. Lives in service_component_filters, owned directly by
// user_id (RLS, 0040_service_component_filters.sql) — presence of any row
// for (user_id, serviceSlug) means "Custom": only notify for those
// components; zero rows means "All components" (today's default). No
// integration lookup anywhere here — the session-scoped client + RLS do
// all the scoping.

// null return means "All components" (no filter row at all) — distinct
// from an empty array, which this table never actually stores (see
// setComponentFilter's own comment).
export async function getComponentFilter(serviceSlug: string): Promise<string[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("service_component_filters").select("component_id").eq("service_slug", serviceSlug);
  if (error) throw error;
  return data.length > 0 ? data.map((row) => row.component_id) : null;
}

// Replaces the full component set for this service via the
// set_component_filter() Postgres function (0040_service_component_filters.sql)
// — a plain client-side delete-then-insert would leave a real window where
// the notification cron could read zero rows (i.e. "All components")
// between the two calls; the function makes the replace atomic.
// componentIds must be non-empty — "notify about nothing" already has a
// dedicated control (excludedServiceSlugs, per integration), so this never
// needs to represent an empty Custom selection.
export async function setComponentFilter(serviceSlug: string, componentIds: string[]): Promise<void> {
  if (componentIds.length === 0) throw new Error("componentIds must be non-empty — use clearComponentFilter for \"All components\".");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_component_filter", { p_service_slug: serviceSlug, p_component_ids: componentIds });
  if (error) throw error;
}

// Reverts to "All components" — deletes every row for this service.
export async function clearComponentFilter(serviceSlug: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("service_component_filters").delete().eq("service_slug", serviceSlug);
  if (error) throw error;
}
