import { getCatalog } from "@/lib/catalog";
import { getAllIntegrationsAcrossUsers } from "@/features/integrations/services/integrations";
import { getSupabaseClient } from "@/lib/supabase";
import { runInBatches } from "@/lib/runInBatches";
import { hasMatchingComponent } from "@/lib/componentNamePrefix";

// Full upstream payload, local to the poller on purpose (types/service.ts only models what the UI reads).
// Optional fields: incident.io-hosted pages omit them entirely (see migration 0028).
type RawComponent = { id: string; name: string; status: string };

type RawIncidentUpdate = {
  id: string;
  incident_id: string;
  status: string;
  body: string;
  affected_components?: RawComponent[] | null;
  created_at: string;
  updated_at: string;
  display_at: string | null;
  deliver_notifications?: boolean;
  custom_tweet?: string | null;
  tweet_id?: string | null;
};

type RawIncident = {
  id: string;
  name: string;
  status: string;
  impact: string;
  created_at: string;
  updated_at: string;
  monitoring_at?: string | null;
  resolved_at: string | null;
  shortlink?: string;
  components?: RawComponent[] | null;
  incident_updates: RawIncidentUpdate[];
};

// Statuspage reuses the `incident_updates` field name for maintenances.
type RawMaintenance = RawIncident & {
  scheduled_for: string;
  scheduled_until: string;
};

const FETCH_CONCURRENCY = 200;

// Shared with the health route. 10min must clear the ~5min sharded cycle or a late tick reads as stale.
export const LOCK_STALE_MS = 10 * 60 * 1000;

// Bulk RPC per data type: per-row calls blew the route's 60s budget (see migration 0007).
async function pollOneServiceIncidents(service: {
  slug: string;
  host: string;
  componentNamePrefix?: string;
}): Promise<{ incidentCount: number; failed: number }> {
  const res = await fetch(`https://${service.host}/api/v2/incidents.json`, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`Upstream returned ${res.status}`);

  const data = await res.json();
  // Shared multi-product host: drop incidents not touching this service's components.
  const rawIncidents = (data.incidents ?? []) as RawIncident[];
  const prefix = service.componentNamePrefix;
  const incidents = prefix ? rawIncidents.filter((incident) => hasMatchingComponent(incident.components, prefix)) : rawIncidents;
  if (incidents.length === 0) return { incidentCount: 0, failed: 0 };

  const supabase = getSupabaseClient();

  const incidentRows = incidents.map((incident) => ({
    id: incident.id,
    name: incident.name,
    status: incident.status,
    impact: incident.impact,
    created_at: incident.created_at,
    updated_at: incident.updated_at,
    monitoring_at: incident.monitoring_at,
    resolved_at: incident.resolved_at,
    shortlink: incident.shortlink,
    components: incident.components,
  }));
  const { data: incidentFailed, error: incidentError } = await supabase.rpc("upsert_incidents_bulk", {
    p_service_slug: service.slug,
    p_incidents: incidentRows,
  });
  if (incidentError) throw incidentError;

  // incident_id taken from the parent, not trusted off the update itself.
  const updateRows = incidents.flatMap((incident) =>
    incident.incident_updates.map((update) => ({ ...update, incident_id: incident.id })),
  );
  let updateFailed = 0;
  if (updateRows.length > 0) {
    const { data: failedCount, error: updateError } = await supabase.rpc("upsert_incident_updates_bulk", {
      p_service_slug: service.slug,
      p_updates: updateRows,
    });
    if (updateError) throw updateError;
    updateFailed = failedCount ?? 0;
  }

  return { incidentCount: incidents.length, failed: (incidentFailed ?? 0) + updateFailed };
}

// Independent of the incident poll so one failing can't take down the other.
// Not /upcoming.json: it drops a maintenance once in_progress, freezing its status.
async function pollOneServiceMaintenances(service: {
  slug: string;
  host: string;
  componentNamePrefix?: string;
}): Promise<{ maintenanceCount: number; failed: number }> {
  const res = await fetch(`https://${service.host}/api/v2/scheduled-maintenances.json`, {
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Upstream returned ${res.status}`);

  const data = await res.json();
  const rawMaintenances = (data.scheduled_maintenances ?? []) as RawMaintenance[];
  const prefix = service.componentNamePrefix;
  const maintenances = prefix
    ? rawMaintenances.filter((maintenance) => hasMatchingComponent(maintenance.components, prefix))
    : rawMaintenances;
  if (maintenances.length === 0) return { maintenanceCount: 0, failed: 0 };

  const supabase = getSupabaseClient();

  const maintenanceRows = maintenances.map((maintenance) => ({
    id: maintenance.id,
    name: maintenance.name,
    status: maintenance.status,
    impact: maintenance.impact,
    created_at: maintenance.created_at,
    updated_at: maintenance.updated_at,
    monitoring_at: maintenance.monitoring_at,
    resolved_at: maintenance.resolved_at,
    scheduled_for: maintenance.scheduled_for,
    scheduled_until: maintenance.scheduled_until,
    shortlink: maintenance.shortlink,
    components: maintenance.components,
  }));
  const { data: maintenanceFailed, error: maintenanceError } = await supabase.rpc("upsert_maintenances_bulk", {
    p_service_slug: service.slug,
    p_maintenances: maintenanceRows,
  });
  if (maintenanceError) throw maintenanceError;

  const updateRows = maintenances.flatMap((maintenance) =>
    maintenance.incident_updates.map((update) => ({ ...update, maintenance_id: maintenance.id })),
  );
  let updateFailed = 0;
  if (updateRows.length > 0) {
    const { data: failedCount, error: updateError } = await supabase.rpc("upsert_maintenance_updates_bulk", {
      p_service_slug: service.slug,
      p_updates: updateRows,
    });
    if (updateError) throw updateError;
    updateFailed = failedCount ?? 0;
  }

  return { maintenanceCount: maintenances.length, failed: (maintenanceFailed ?? 0) + updateFailed };
}

async function backfillIfFirstPoll(Slug: string, failed: number, getIntegrationsAcrossUsersOnce: () => ReturnType<typeof getAllIntegrationsAcrossUsers>) {
  const supabase = getSupabaseClient();
  const { data: seen } = await supabase.from("polled_services").select("service_slug").eq("service_slug", Slug).maybeSingle();
  if (seen) return;

  // First poll: mark pre-existing history delivered to every account's integrations (cross-account, cron has no session).
  const { data: events, error: eventsError } = await supabase.from("incident_events").select("id").eq("service_slug", Slug);
  if (eventsError) {
    // Must not fall through as "zero events" and get marked seeded. Retry next cycle.
    console.error(`backfillIfFirstPoll: failed to read incident_events for "${Slug}":`, eventsError);
    return;
  }
  const integrations = await getIntegrationsAcrossUsersOnce();
  const rows = (events ?? []).flatMap((event) =>
    integrations.map(({ integration }) => ({ event_id: event.id, integration_id: integration.id })),
  );
  if (rows.length > 0) {
    const { error: deliveryError } = await supabase
      .from("incident_event_deliveries")
      .upsert(rows, { onConflict: "event_id,integration_id", ignoreDuplicates: true });
    if (deliveryError) {
      // Marking seeded without suppression rows would flood every integration. Retry next cycle.
      console.error(`backfillIfFirstPoll: failed to backfill deliveries for "${Slug}":`, deliveryError);
      return;
    }
  }

  // Seed only on a clean pass, so a row that succeeds on retry is still suppressed as history.
  if (failed === 0) {
    await supabase.from("polled_services").insert({ service_slug: Slug });
  }
}

// djb2 hash, so shard membership doesn't reshuffle when catalog rows are inserted.
function hashSlug(slug: string): number {
  let hash = 5381;
  for (let i = 0; i < slug.length; i++) hash = (hash * 33) ^ slug.charCodeAt(i);
  return hash >>> 0;
}

export async function pollAllIncidents(
  shard?: { index: number; count: number },
): Promise<{
  servicesPolled: number;
  incidentsUpserted: number;
  failed: number;
  maintenancesUpserted: number;
  maintenancesFailed: number;
}> {
  const all = await getCatalog();
  const services = shard ? all.filter((service) => hashSlug(service.slug) % shard.count === shard.index) : all;
  let incidentsUpserted = 0;
  let failedTotal = 0;
  let maintenancesUpserted = 0;
  let maintenancesFailedTotal = 0;

  // Lazy and memoized: usually unused, but many new services in one cycle share one fetch.
  let integrationsAcrossUsersPromise: ReturnType<typeof getAllIntegrationsAcrossUsers> | null = null;
  function getIntegrationsAcrossUsersOnce() {
    integrationsAcrossUsersPromise ??= getAllIntegrationsAcrossUsers();
    return integrationsAcrossUsersPromise;
  }

  await runInBatches(services, FETCH_CONCURRENCY, async (service) => {
    // allSettled so one endpoint failing never blocks the other.
    const [incidentResult, maintenanceResult] = await Promise.allSettled([
      pollOneServiceIncidents(service),
      pollOneServiceMaintenances(service),
    ]);

    if (incidentResult.status === "fulfilled") {
      const { incidentCount, failed } = incidentResult.value;
      // Clamped: failed includes update rows and can exceed incidentCount.
      incidentsUpserted += Math.max(0, incidentCount - failed);
      failedTotal += failed;
      await backfillIfFirstPoll(service.slug, failed, getIntegrationsAcrossUsersOnce);
    } else {
      failedTotal++;
      // Logged here because the caller never inspects the return value.
      console.error(`pollOneServiceIncidents failed for "${service.slug}":`, incidentResult.reason);
    }

    if (maintenanceResult.status === "fulfilled") {
      const { maintenanceCount, failed } = maintenanceResult.value;
      maintenancesUpserted += Math.max(0, maintenanceCount - failed);
      maintenancesFailedTotal += failed;
    } else {
      maintenancesFailedTotal++;
      console.error(`pollOneServiceMaintenances failed for "${service.slug}":`, maintenanceResult.reason);
    }
  });

  return {
    servicesPolled: services.length,
    incidentsUpserted,
    failed: failedTotal,
    maintenancesUpserted,
    maintenancesFailed: maintenancesFailedTotal,
  };
}
