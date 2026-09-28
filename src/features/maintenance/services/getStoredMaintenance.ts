import { getSupabaseClient } from "@/lib/supabase";
import { nowIso } from "@/lib/formatTime";
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

// Only the columns the shape-mappers read, plus service_slug for grouping.
const MAINTENANCE_SUMMARY_COLUMNS =
  "id, service_slug, name, status, impact, created_at, resolved_at, updated_at, shortlink, scheduled_for, scheduled_until";
const MAINTENANCE_UPDATE_COLUMNS = "id, maintenance_id, service_slug, status, body, created_at";

// maintenance_id alone isn't unique across services.
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

// Scoped to trackedSlugs in the query so it stays cheap as the catalog grows.
// Known gap: a maintenance cancelled far in advance stays visible until its
// scheduled_until passes, since the poller can't see removals.
export async function getAllStoredMaintenances(trackedSlugs: string[]): Promise<StoredMaintenance[]> {
  if (trackedSlugs.length === 0) return [];
  const supabase = getSupabaseClient();
  const nowIsoValue = nowIso();

  const { data: maintenances } = await supabase
    .from("maintenances")
    .select(MAINTENANCE_SUMMARY_COLUMNS)
    .in("service_slug", trackedSlugs)
    .neq("status", "completed")
    .or(`scheduled_until.gte.${nowIsoValue},status.eq.in_progress`)
    .order("scheduled_for", { ascending: true });
  if (!maintenances?.length) return [];

  const { data: updates } = await supabase.from("maintenance_updates").select(MAINTENANCE_UPDATE_COLUMNS).in("service_slug", trackedSlugs);
  const grouped = groupUpdatesByMaintenance((updates as StoredMaintenanceUpdate[]) ?? []);

  return (maintenances as Omit<StoredMaintenance, "maintenance_updates">[]).map((maintenance) => ({
    ...maintenance,
    maintenance_updates: grouped.get(`${maintenance.service_slug}:${maintenance.id}`) ?? [],
  }));
}

// No maintenance_updates query: list pages only render one full timeline at a time.
export async function getAllStoredMaintenanceSummaries(trackedSlugs: string[]): Promise<Omit<StoredMaintenance, "maintenance_updates">[]> {
  if (trackedSlugs.length === 0) return [];
  const supabase = getSupabaseClient();
  const nowIsoValue = nowIso();

  const { data } = await supabase
    .from("maintenances")
    .select(MAINTENANCE_SUMMARY_COLUMNS)
    .in("service_slug", trackedSlugs)
    .neq("status", "completed")
    .or(`scheduled_until.gte.${nowIsoValue},status.eq.in_progress`)
    .order("scheduled_for", { ascending: true });

  return (data as Omit<StoredMaintenance, "maintenance_updates">[]) ?? [];
}

export async function getStoredMaintenanceWithUpdates(Slug: string, maintenanceId: string): Promise<StoredMaintenance | null> {
  const supabase = getSupabaseClient();

  const { data: maintenance } = await supabase
    .from("maintenances")
    .select("*")
    .eq("service_slug", Slug)
    .eq("id", maintenanceId)
    .maybeSingle();
  if (!maintenance) return null;

  const { data: updates } = await supabase
    .from("maintenance_updates")
    .select("*")
    .eq("service_slug", Slug)
    .eq("maintenance_id", maintenanceId)
    .order("created_at", { ascending: false });

  return { ...(maintenance as Omit<StoredMaintenance, "maintenance_updates">), maintenance_updates: (updates as StoredMaintenanceUpdate[]) ?? [] };
}

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
