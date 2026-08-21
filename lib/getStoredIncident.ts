import { getSupabaseClient } from "@/lib/supabase";

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
