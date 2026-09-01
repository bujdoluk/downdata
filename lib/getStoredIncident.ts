import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import type { Incident, StatuspageIncidentSummary } from "@/types/service";

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

// The columns toIncidentApiShape/toIncidentSummaryApiShape actually read,
// plus service_slug (needed for the grouping join below, even though it
// never appears in the mapped API response). monitoring_at/components are
// real StoredIncident fields — general-purpose readers below still select
// "*" — but nothing on this list-and-map path uses them, and these queries
// are polled every 60s, so selecting them was pure wasted egress.
const INCIDENT_SUMMARY_COLUMNS = "id, service_slug, name, status, impact, created_at, resolved_at, updated_at, shortlink";
const INCIDENT_UPDATE_COLUMNS = "id, incident_id, service_slug, status, body, created_at";

// The one place anything (the Slack notifier today, anything else later)
// reads a stored incident back out of Supabase with its updates attached.
// Deliberately "*", not the trimmed column lists above — this is a
// general-purpose accessor, not paired with one known shape-mapper, and
// it's not polled, so there's no meaningful egress payoff to narrowing it.
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

// PostgREST silently caps any unbounded select() at its configured
// max-rows (1000 here) — catalog-wide polling grew incident_updates well
// past that, so a plain `.select("*")` was quietly dropping updates for
// whichever incidents didn't make it into that first page. Fetch only the
// updates belonging to the incidents actually in play, in explicit
// PAGE_SIZE pages, so growth in unrelated incidents' history never starves
// this response again. incident_id is chunked through .in() (not the
// service_slug/incident_id pair) for the same accepted reason
// groupUpdatesByIncident groups on the composite key below: a short id
// colliding across services just pulls in a few harmless extra rows that
// get discarded when nothing maps to their key.
const CHUNK_SIZE = 200;
const PAGE_SIZE = 1000;

async function fetchUpdatesForIncidentIds(
  supabase: SupabaseClient,
  incidentIds: string[],
  Slug?: string,
): Promise<StoredIncidentUpdate[]> {
  const results: StoredIncidentUpdate[] = [];
  for (let i = 0; i < incidentIds.length; i += CHUNK_SIZE) {
    const chunk = incidentIds.slice(i, i + CHUNK_SIZE);
    let from = 0;
    for (;;) {
      let query = supabase.from("incident_updates").select(INCIDENT_UPDATE_COLUMNS).in("incident_id", chunk);
      if (Slug) query = query.eq("service_slug", Slug);
      const { data } = await query.range(from, from + PAGE_SIZE - 1);
      results.push(...((data as StoredIncidentUpdate[]) ?? []));
      if (!data || data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }
  return results;
}

// Same rows as getStoredIncidentsForService but no incident_updates query at
// all — powers /api/incidents' list response, polled every 60s by several
// pages that only ever render one incident's full timeline at a time. Not
// just trimming the response: skipping this query means that data never
// leaves Postgres in the first place.
//
// Scoped to trackedSlugs *in the query* (not filtered afterward), same
// reasoning as getAllStoredMaintenanceSummaries — this used to fetch
// catalog-wide (up to .limit(1000), unfiltered) and let the route throw
// away everything but the caller's tracked services, which meant every
// 60s poll from every open tab paid full egress for the whole catalog's
// incident history regardless of how few services anyone actually tracks.
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

// One service's incidents, newest-updated first — powers /api/history/[slug]
// (unbounded: that page lets you browse any past year, so it genuinely
// needs full history) and /api/summary/[slug] (passes a small `limit` — a
// live status page showing a service's entire incident history, re-fetched
// every 60s, is neither useful UX nor worth the egress; recent incidents
// only, same idea as a real status page pointing elsewhere for history).
export async function getStoredIncidentsForService(Slug: string, options?: { limit?: number }): Promise<StoredIncident[]> {
  const supabase = getSupabaseClient();

  let query = supabase
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

// One service's incidents that overlap a trailing window (started inside
// it, still ongoing, or resolved inside it) — powers the outage tracker on
// ServiceDetail. Same trimmed columns as getAllStoredIncidentSummaries (no
// incident_updates join), windowed the same way getAllStoredMaintenances
// windows "still relevant": an incident that started before sinceIso but
// hasn't resolved yet (or resolved after sinceIso) still belongs in the
// window, not just ones created inside it.
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

// Total incident count per service, for the history page's overview chart —
// aggregated in Postgres (incident_counts_by_service()), not by pulling every
// incident row into JS just to count them.
export async function getIncidentCountsByService(): Promise<IncidentCountByService[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.rpc("incident_counts_by_service");
  return (data as IncidentCountByService[]) ?? [];
}

// Same mapping as toIncidentApiShape, minus incident_updates — for the
// summary rows getAllStoredIncidentSummaries() returns (no updates to map).
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

// Maps the DB's stored shape (extra fields: service_slug, monitoring_at,
// components) down to the Incident shape the UI already expects.
// shortlink is nullable in the DB but not in that type — real Statuspage
// incidents always have one, so "" only ever shows up if that assumption
// is ever wrong.
export function toIncidentApiShape(incident: StoredIncident): Incident {
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
