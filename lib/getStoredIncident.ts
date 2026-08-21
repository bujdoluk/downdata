import { getSupabaseClient } from "@/lib/supabase";
import type { StatuspageIncident } from "@/types/service";

export type StoredIncidentUpdate = {
  service_slug: string;
  incident_id: string;
  id: string;
  status: string;
  body: string;
  affected_components: unknown;
  created_at: string;
  updated_at: string;
  display_at: string | null;
  deliver_notifications: boolean;
  custom_tweet: string | null;
  tweet_id: string | null;
};

export type StoredIncident = {
  service_slug: string;
  id: string;
  name: string;
  status: string;
  impact: string;
  created_at: string;
  updated_at: string;
  monitoring_at: string | null;
  resolved_at: string | null;
  shortlink: string | null;
  components: unknown;
  incident_updates: StoredIncidentUpdate[];
};

// The one place anything (the Slack notifier today, anything else later)
// reads a stored incident back out of Supabase with its updates attached.
export async function getStoredIncidentWithUpdates(serviceSlug: string, incidentId: string): Promise<StoredIncident | null> {
  const supabase = getSupabaseClient();

  const { data: incident } = await supabase
    .from("incidents")
    .select("*")
    .eq("service_slug", serviceSlug)
    .eq("id", incidentId)
    .maybeSingle();
  if (!incident) return null;

  const { data: updates } = await supabase
    .from("incident_updates")
    .select("*")
    .eq("service_slug", serviceSlug)
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: false });

  return { ...(incident as Omit<StoredIncident, "incident_updates">), incident_updates: (updates as StoredIncidentUpdate[]) ?? [] };
}

// incident_updates.incident_id alone isn't guaranteed unique across
// services (each service has its own Statuspage-assigned id namespace), so
// grouping across all services has to key on the (service_slug, incident_id)
// pair, not incident_id alone.
function groupUpdatesByIncident(updates: StoredIncidentUpdate[]): Map<string, StoredIncidentUpdate[]> {
  const map = new Map<string, StoredIncidentUpdate[]>();
  for (const update of updates) {
    const key = `${update.service_slug}:${update.incident_id}`;
    const list = map.get(key);
    if (list) list.push(update);
    else map.set(key, [update]);
  }
  return map;
}

// All tracked services' incidents, newest-updated first — powers
// /api/incidents. Two flat queries instead of one per incident, same shape
// as the notifier's existing batch-query pattern; capped at 1000 rows like
// lib/notifyIncidentEvents.ts's own event query.
export async function getAllStoredIncidents(): Promise<StoredIncident[]> {
  const supabase = getSupabaseClient();

  const { data: incidents } = await supabase.from("incidents").select("*").order("updated_at", { ascending: false }).limit(1000);
  if (!incidents?.length) return [];

  const { data: updates } = await supabase.from("incident_updates").select("*");
  const grouped = groupUpdatesByIncident((updates as StoredIncidentUpdate[]) ?? []);

  return (incidents as Omit<StoredIncident, "incident_updates">[]).map((incident) => ({
    ...incident,
    incident_updates: grouped.get(`${incident.service_slug}:${incident.id}`) ?? [],
  }));
}

// One service's incidents, newest-updated first — powers /api/history/[slug]
// and /api/summary/[slug].
export async function getStoredIncidentsForService(serviceSlug: string): Promise<StoredIncident[]> {
  const supabase = getSupabaseClient();

  const { data: incidents } = await supabase
    .from("incidents")
    .select("*")
    .eq("service_slug", serviceSlug)
    .order("updated_at", { ascending: false });
  if (!incidents?.length) return [];

  const { data: updates } = await supabase.from("incident_updates").select("*").eq("service_slug", serviceSlug);
  const grouped = groupUpdatesByIncident((updates as StoredIncidentUpdate[]) ?? []);

  return (incidents as Omit<StoredIncident, "incident_updates">[]).map((incident) => ({
    ...incident,
    incident_updates: grouped.get(`${incident.service_slug}:${incident.id}`) ?? [],
  }));
}

// Maps the DB's stored shape (extra fields: service_slug, monitoring_at,
// components) down to the StatuspageIncident shape the UI already expects.
// shortlink is nullable in the DB but not in that type — real Statuspage
// incidents always have one, so "" only ever shows up if that assumption
// is ever wrong.
export function toIncidentApiShape(incident: StoredIncident): StatuspageIncident {
  return {
    id: incident.id,
    name: incident.name,
    status: incident.status,
    impact: incident.impact,
    created_at: incident.created_at,
    resolved_at: incident.resolved_at,
    updated_at: incident.updated_at,
    shortlink: incident.shortlink ?? "",
    incident_updates: incident.incident_updates
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((update) => ({ id: update.id, status: update.status, body: update.body, created_at: update.created_at })),
  };
}
