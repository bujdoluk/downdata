import { getSupabaseClient } from "@/lib/supabase";
import type { ScheduledMaintenance, ScheduledMaintenanceSummary } from "@/types/service";

export type StoredMaintenanceUpdate = {
  service_slug: string;
  maintenance_id: string;
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

export type StoredMaintenance = {
  service_slug: string;
  id: string;
  name: string;
  status: string;
  impact: string;
  created_at: string;
  updated_at: string;
  monitoring_at: string | null;
  resolved_at: string | null;
  scheduled_for: string;
  scheduled_until: string;
  shortlink: string | null;
  components: unknown;
  maintenance_updates: StoredMaintenanceUpdate[];
};

// maintenance_updates.maintenance_id alone isn't guaranteed unique across
// services, same reasoning as getStoredIncident.ts's grouping helper.
function groupUpdatesByMaintenance(updates: StoredMaintenanceUpdate[]): Map<string, StoredMaintenanceUpdate[]> {
  const map = new Map<string, StoredMaintenanceUpdate[]>();
  for (const update of updates) {
    const key = `${update.service_slug}:${update.maintenance_id}`;
    const list = map.get(key);
    if (list) list.push(update);
    else map.set(key, [update]);
  }
  return map;
}

// Tracked services' still-relevant maintenances, soonest-scheduled first —
// powers /api/maintenance. Scoped to trackedSlugs *in the query* (not
// filtered afterward) so this stays cheap and correct as the catalog grows
// well beyond what any one user tracks.
//
// "Still relevant" = not explicitly completed, and either its window
// hasn't passed yet or it's actively in progress (covers a maintenance
// that overran its original scheduled_until without disappearing early).
// This can't fully catch a maintenance cancelled well before its window —
// nothing tells the poller something vanished from the upstream feed,
// only what's still in it — so a maintenance cancelled far in advance
// stays visible until its original scheduled_until passes. Accepted,
// not solved: closing that gap needs a last-seen-at freshness column,
// not built without evidence it's actually needed.
export async function getAllStoredMaintenances(trackedSlugs: string[]): Promise<StoredMaintenance[]> {
  if (trackedSlugs.length === 0) return [];
  const supabase = getSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: maintenances } = await supabase
    .from("maintenances")
    .select("*")
    .in("service_slug", trackedSlugs)
    .neq("status", "completed")
    .or(`scheduled_until.gte.${nowIso},status.eq.in_progress`)
    .order("scheduled_for", { ascending: true });
  if (!maintenances?.length) return [];

  const { data: updates } = await supabase.from("maintenance_updates").select("*").in("service_slug", trackedSlugs);
  const grouped = groupUpdatesByMaintenance((updates as StoredMaintenanceUpdate[]) ?? []);

  return (maintenances as Omit<StoredMaintenance, "maintenance_updates">[]).map((maintenance) => ({
    ...maintenance,
    maintenance_updates: grouped.get(`${maintenance.service_slug}:${maintenance.id}`) ?? [],
  }));
}

// Same "still relevant" filter as getAllStoredMaintenances, no
// maintenance_updates query — powers /api/maintenance's list response,
// polled every 60s by pages that only ever render one maintenance's full
// timeline at a time. See getAllStoredIncidentSummaries's reasoning.
export async function getAllStoredMaintenanceSummaries(trackedSlugs: string[]): Promise<Omit<StoredMaintenance, "maintenance_updates">[]> {
  if (trackedSlugs.length === 0) return [];
  const supabase = getSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("maintenances")
    .select("*")
    .in("service_slug", trackedSlugs)
    .neq("status", "completed")
    .or(`scheduled_until.gte.${nowIso},status.eq.in_progress`)
    .order("scheduled_for", { ascending: true });

  return (data as Omit<StoredMaintenance, "maintenance_updates">[]) ?? [];
}

// One maintenance with its full update timeline — mirrors
// getStoredIncident.ts's getStoredIncidentWithUpdates, backing the
// per-item detail route (app/api/maintenance/[slug]/[id]).
export async function getStoredMaintenanceWithUpdates(serviceSlug: string, maintenanceId: string): Promise<StoredMaintenance | null> {
  const supabase = getSupabaseClient();

  const { data: maintenance } = await supabase
    .from("maintenances")
    .select("*")
    .eq("service_slug", serviceSlug)
    .eq("id", maintenanceId)
    .maybeSingle();
  if (!maintenance) return null;

  const { data: updates } = await supabase
    .from("maintenance_updates")
    .select("*")
    .eq("service_slug", serviceSlug)
    .eq("maintenance_id", maintenanceId)
    .order("created_at", { ascending: false });

  return { ...(maintenance as Omit<StoredMaintenance, "maintenance_updates">), maintenance_updates: (updates as StoredMaintenanceUpdate[]) ?? [] };
}

// Same mapping as toMaintenanceApiShape, minus the update timeline — for
// the summary rows getAllStoredMaintenanceSummaries() returns.
export function toMaintenanceSummaryApiShape(maintenance: Omit<StoredMaintenance, "maintenance_updates">): ScheduledMaintenanceSummary {
  return {
    id: maintenance.id,
    name: maintenance.name,
    status: maintenance.status,
    impact: maintenance.impact,
    created_at: maintenance.created_at,
    resolved_at: maintenance.resolved_at,
    updated_at: maintenance.updated_at,
    shortlink: maintenance.shortlink ?? "",
    scheduled_for: maintenance.scheduled_for,
    scheduled_until: maintenance.scheduled_until,
  };
}

// Maps the DB's stored shape down to the ScheduledMaintenance shape the UI
// already expects — same reasoning as getStoredIncident.ts's
// toIncidentApiShape, plus the two scheduling fields it doesn't have.
export function toMaintenanceApiShape(maintenance: StoredMaintenance): ScheduledMaintenance {
  return {
    id: maintenance.id,
    name: maintenance.name,
    status: maintenance.status,
    impact: maintenance.impact,
    created_at: maintenance.created_at,
    resolved_at: maintenance.resolved_at,
    updated_at: maintenance.updated_at,
    shortlink: maintenance.shortlink ?? "",
    scheduled_for: maintenance.scheduled_for,
    scheduled_until: maintenance.scheduled_until,
    incident_updates: maintenance.maintenance_updates
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((update) => ({ id: update.id, status: update.status, body: update.body, created_at: update.created_at })),
  };
}
