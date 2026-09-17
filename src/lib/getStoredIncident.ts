import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import type { Incident, IncidentComponent, StatuspageIncidentSummary } from "@/types/service";

export type AffectedComponent = { code: string; name: string; new_status: string; old_status: string };

export type StoredIncidentUpdate = {
  service_slug: string;
  incident_id: string;
  id: string;
  status: string;
  body: string;
  affected_components: AffectedComponent[] | null;
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

const INCIDENT_SUMMARY_COLUMNS = "id, service_slug, name, status, impact, created_at, resolved_at, updated_at, shortlink";
const INCIDENT_UPDATE_COLUMNS = "id, incident_id, service_slug, status, body, created_at";
// The columns INCIDENT_UPDATE_COLUMNS above actually selects — every other
// StoredIncidentUpdate field is genuinely absent (undefined) on a row
// fetchUpdatesForIncidentIds returns, not just loosely typed. Partial<>
// makes that honest: a row from this narrower path can no longer silently
// claim (via a blanket `as StoredIncidentUpdate[]` cast) that fields like
// affected_components are always present when they were never fetched.
type IncidentUpdateListRow = Pick<StoredIncidentUpdate, "id" | "incident_id" | "service_slug" | "status" | "body" | "created_at"> &
  Partial<Omit<StoredIncidentUpdate, "id" | "incident_id" | "service_slug" | "status" | "body" | "created_at">>;

export async function getStoredIncidentWithUpdates(Slug: string, incidentId: string): Promise<StoredIncident | null> {
  const supabase = getSupabaseClient();

  const { data: incident } = await supabase
    .from("incidents")
    .select("*")
    .eq("service_slug", Slug)
    .eq("id", incidentId)
    .maybeSingle();
  if (!incident) return null;

  const { data: updates } = await supabase
    .from("incident_updates")
    .select("*")
    .eq("service_slug", Slug)
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: false });

  return { ...(incident as Omit<StoredIncident, "incident_updates">), incident_updates: (updates as StoredIncidentUpdate[]) ?? [] };
}

function groupUpdatesByIncident(updates: IncidentUpdateListRow[]): Map<string, IncidentUpdateListRow[]> {
  const map = new Map<string, IncidentUpdateListRow[]>();
  for (const update of updates) {
    const key = `${update.service_slug}:${update.incident_id}`;
    const list = map.get(key);
    if (list) list.push(update);
    else map.set(key, [update]);
  }
  return map;
}

const CHUNK_SIZE = 200;
const PAGE_SIZE = 1000;

async function fetchUpdatesForIncidentIds(
  supabase: SupabaseClient,
  incidentIds: string[],
  Slug?: string,
): Promise<IncidentUpdateListRow[]> {
  const results: IncidentUpdateListRow[] = [];
  for (let i = 0; i < incidentIds.length; i += CHUNK_SIZE) {
    const chunk = incidentIds.slice(i, i + CHUNK_SIZE);
    let from = 0;
    for (;;) {
      let query = supabase.from("incident_updates").select(INCIDENT_UPDATE_COLUMNS).in("incident_id", chunk);
      if (Slug) query = query.eq("service_slug", Slug);
      const { data } = await query.range(from, from + PAGE_SIZE - 1);
      results.push(...((data as IncidentUpdateListRow[]) ?? []));
      if (!data || data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }
  return results;
}

export async function getAllStoredIncidentSummaries(trackedSlugs: string[]): Promise<Omit<StoredIncident, "incident_updates">[]> {
  if (trackedSlugs.length === 0) return [];
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("incidents")
    .select(INCIDENT_SUMMARY_COLUMNS)
    .in("service_slug", trackedSlugs)
    .order("updated_at", { ascending: false })
    .limit(1000);
  return (data as Omit<StoredIncident, "incident_updates">[]) ?? [];
}

// What getStoredIncidentsForService actually returns — incident fields are
// the real, full set (INCIDENT_SUMMARY_COLUMNS, plus components when
// asked for), but incident_updates are IncidentUpdateListRow, not full
// StoredIncidentUpdate — see that type's own comment for why.
export type StoredIncidentSummaryWithUpdates = Omit<StoredIncident, "incident_updates"> & { incident_updates: IncidentUpdateListRow[] };

export async function getStoredIncidentsForService(
  Slug: string,
  options?: { limit?: number; includeComponents?: boolean },
): Promise<StoredIncidentSummaryWithUpdates[]> {
  const supabase = getSupabaseClient();

  let query = options?.includeComponents
    ? supabase
        .from("incidents")
        .select(`${INCIDENT_SUMMARY_COLUMNS}, components`)
        .eq("service_slug", Slug)
        .order("updated_at", { ascending: false })
    : supabase
        .from("incidents")
        .select(INCIDENT_SUMMARY_COLUMNS)
        .eq("service_slug", Slug)
        .order("updated_at", { ascending: false });
  if (options?.limit) query = query.limit(options.limit);
  const { data: incidents } = await query;
  if (!incidents?.length) return [];

  const updates = await fetchUpdatesForIncidentIds(
    supabase,
    incidents.map((incident) => incident.id as string),
    Slug,
  );
  const grouped = groupUpdatesByIncident(updates);

  return (incidents as Omit<StoredIncident, "incident_updates">[]).map((incident) => ({
    ...incident,
    incident_updates: grouped.get(`${incident.service_slug}:${incident.id}`) ?? [],
  }));
}

export async function getStoredIncidentSummariesForService(Slug: string, sinceIso: string): Promise<Omit<StoredIncident, "incident_updates">[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("incidents")
    .select(INCIDENT_SUMMARY_COLUMNS)
    .eq("service_slug", Slug)
    .or(`created_at.gte.${sinceIso},resolved_at.is.null,resolved_at.gte.${sinceIso}`)
    .order("created_at", { ascending: true });
  return (data as Omit<StoredIncident, "incident_updates">[]) ?? [];
}

export type IncidentCountByService = { service_slug: string; count: number };

export async function getIncidentCountsByService(): Promise<IncidentCountByService[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.rpc("incident_counts_by_service");
  return (data as IncidentCountByService[]) ?? [];
}

export function toIncidentSummaryApiShape(incident: Omit<StoredIncident, "incident_updates">): StatuspageIncidentSummary {
  return {
    id: incident.id,
    name: incident.name,
    status: incident.status,
    impact: incident.impact,
    created_at: incident.created_at,
    resolved_at: incident.resolved_at,
    updated_at: incident.updated_at,
    shortlink: incident.shortlink ?? "",
  };
}

// Accepts either the full StoredIncident (from getStoredIncidentWithUpdates,
// used by /api/incidents/[slug]/[id]) or the narrower
// StoredIncidentSummaryWithUpdates (from getStoredIncidentsForService, used
// by /api/history/[slug] and /api/summary/[slug]) — this only ever reads
// {id, status, body, created_at} off each update below, so both shapes
// satisfy it structurally without needing two separate functions.
export function toIncidentApiShape(incident: StoredIncident | StoredIncidentSummaryWithUpdates): Incident {
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
    ...(incident.components ? { components: incident.components as IncidentComponent[] } : {}),
  };
}
