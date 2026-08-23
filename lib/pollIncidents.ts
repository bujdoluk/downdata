import { getCatalog } from "@/lib/catalog";
import { getAllIntegrations } from "@/lib/integrations";
import { getSupabaseClient } from "@/lib/supabase";
import { runInBatches } from "@/lib/runInBatches";

// The full upstream Statuspage payload — deliberately not types/service.ts's
// StatuspageIncident, which only ever modeled what the current UI reads and
// is read structurally across service/, history/, incidents/ (see AGENTS.md).
// This type is local to the poller on purpose.
type RawComponent = { id: string; name: string; status: string };

type RawIncidentUpdate = {
  id: string;
  incident_id: string;
  status: string;
  body: string;
  affected_components: RawComponent[] | null;
  created_at: string;
  updated_at: string;
  display_at: string | null;
  deliver_notifications: boolean;
  custom_tweet: string | null;
  tweet_id: string | null;
};

type RawIncident = {
  id: string;
  name: string;
  status: string;
  impact: string;
  created_at: string;
  updated_at: string;
  monitoring_at: string | null;
  resolved_at: string | null;
  shortlink: string;
  components: RawComponent[] | null;
  incident_updates: RawIncidentUpdate[];
};

// Statuspage models a scheduled maintenance as an incident-shaped object
// plus a scheduling window — its own API reuses the `incident_updates`
// field name even here, not `maintenance_updates`.
type RawMaintenance = RawIncident & {
  scheduled_for: string;
  scheduled_until: string;
};

const FETCH_CONCURRENCY = 200;

async function upsertIncident(serviceSlug: string, incident: RawIncident) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("upsert_incident", {
    p_service_slug: serviceSlug,
    p_id: incident.id,
    p_name: incident.name,
    p_status: incident.status,
    p_impact: incident.impact,
    p_created_at: incident.created_at,
    p_updated_at: incident.updated_at,
    p_monitoring_at: incident.monitoring_at,
    p_resolved_at: incident.resolved_at,
    p_shortlink: incident.shortlink,
    p_components: incident.components,
  });
  if (error) throw error;

  for (const update of incident.incident_updates) {
    const { error: updateError } = await supabase.rpc("upsert_incident_update", {
      p_service_slug: serviceSlug,
      p_incident_id: incident.id,
      p_id: update.id,
      p_status: update.status,
      p_body: update.body,
      p_affected_components: update.affected_components,
      p_created_at: update.created_at,
      p_updated_at: update.updated_at,
      p_display_at: update.display_at,
      p_deliver_notifications: update.deliver_notifications,
      p_custom_tweet: update.custom_tweet,
      p_tweet_id: update.tweet_id,
    });
    if (updateError) throw updateError;
  }
}

async function upsertMaintenance(serviceSlug: string, maintenance: RawMaintenance) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("upsert_maintenance", {
    p_service_slug: serviceSlug,
    p_id: maintenance.id,
    p_name: maintenance.name,
    p_status: maintenance.status,
    p_impact: maintenance.impact,
    p_created_at: maintenance.created_at,
    p_updated_at: maintenance.updated_at,
    p_monitoring_at: maintenance.monitoring_at,
    p_resolved_at: maintenance.resolved_at,
    p_scheduled_for: maintenance.scheduled_for,
    p_scheduled_until: maintenance.scheduled_until,
    p_shortlink: maintenance.shortlink,
    p_components: maintenance.components,
  });
  if (error) throw error;

  for (const update of maintenance.incident_updates) {
    const { error: updateError } = await supabase.rpc("upsert_maintenance_update", {
      p_service_slug: serviceSlug,
      p_maintenance_id: maintenance.id,
      p_id: update.id,
      p_status: update.status,
      p_body: update.body,
      p_affected_components: update.affected_components,
      p_created_at: update.created_at,
      p_updated_at: update.updated_at,
      p_display_at: update.display_at,
      p_deliver_notifications: update.deliver_notifications,
      p_custom_tweet: update.custom_tweet,
      p_tweet_id: update.tweet_id,
    });
    if (updateError) throw updateError;
  }
}

// Returns how many of this service's incidents failed to upsert — used to
// decide whether this service's first poll is clean enough to mark seeded.
async function pollOneServiceIncidents(service: { slug: string; host: string }): Promise<{ incidentCount: number; failed: number }> {
  const res = await fetch(`https://${service.host}/api/v2/incidents.json`, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`Upstream returned ${res.status}`);

  const data = await res.json();
  const incidents = (data.incidents ?? []) as RawIncident[];

  let failed = 0;
  for (const incident of incidents) {
    // Isolated per incident: one malformed incident (bad timestamp,
    // unexpected null) can't take its otherwise-healthy siblings down.
    try {
      await upsertIncident(service.slug, incident);
    } catch {
      failed++;
    }
  }

  return { incidentCount: incidents.length, failed };
}

// Sibling to pollOneServiceIncidents, not a branch inside it — kept as a
// fully independent function so a maintenance-fetch failure can never take
// that service's incident poll down with it (see how the two are run via
// Promise.allSettled in pollAllIncidents below). No backfill/notification
// concerns here unlike incidents — nothing notifies about maintenances.
//
// Deliberately the plain (unfiltered) endpoint, not /upcoming.json: a
// maintenance stops being "upcoming" the instant it goes in_progress, so
// polling that endpoint would silently stop seeing a maintenance right as
// it starts — its status and updates would freeze at whatever they were
// pre-start forever. This endpoint returns the last ~50 regardless of
// status (scheduled/in_progress/completed); getAllStoredMaintenances
// already filters completed/stale ones back out at read time.
async function pollOneServiceMaintenances(service: { slug: string; host: string }): Promise<{ maintenanceCount: number; failed: number }> {
  const res = await fetch(`https://${service.host}/api/v2/scheduled-maintenances.json`, {
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Upstream returned ${res.status}`);

  const data = await res.json();
  const maintenances = (data.scheduled_maintenances ?? []) as RawMaintenance[];

  let failed = 0;
  for (const maintenance of maintenances) {
    try {
      await upsertMaintenance(service.slug, maintenance);
    } catch {
      failed++;
    }
  }

  return { maintenanceCount: maintenances.length, failed };
}

async function backfillIfFirstPoll(serviceSlug: string, failed: number) {
  const supabase = getSupabaseClient();
  const { data: seen } = await supabase.from("polled_services").select("service_slug").eq("service_slug", serviceSlug).maybeSingle();
  if (seen) return;

  // First time this service has ever been polled: mark everything it just
  // produced as already-delivered to every currently connected integration,
  // so this initial backfill of pre-existing history never gets notified.
  const { data: events } = await supabase.from("incident_events").select("id").eq("service_slug", serviceSlug);
  const integrations = await getAllIntegrations();
  const rows = (events ?? []).flatMap((event) => integrations.map((integration) => ({ event_id: event.id, integration_slug: integration.slug })));
  if (rows.length > 0) {
    const { error: deliveryError } = await supabase
      .from("incident_event_deliveries")
      .upsert(rows, { onConflict: "event_id,integration_slug", ignoreDuplicates: true });
    if (deliveryError) {
      // Don't mark seeded below if the suppression rows didn't actually
      // land — a silent failure here followed by a "seeded" marker would
      // let this service's whole backlog flood every integration on the
      // next notify cycle instead. Retry backfill next poll cycle instead.
      console.error(`backfillIfFirstPoll: failed to backfill deliveries for "${serviceSlug}":`, deliveryError);
      return;
    }
  }

  // Only mark it seeded once a pass had zero per-incident failures — a
  // failure that succeeds on a later retry is still backfilled history,
  // not a new event, so it still deserves suppression rather than
  // slipping through as "new" just because it failed once first.
  if (failed === 0) {
    await supabase.from("polled_services").insert({ service_slug: serviceSlug });
  }
}

// djb2 — deterministic per slug, independent of catalog table order or
// size, unlike an array-index modulo which reshuffles shard membership
// every time a row is inserted before an existing one alphabetically.
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

  await runInBatches(services, FETCH_CONCURRENCY, async (service) => {
    // allSettled, not all: incidents and maintenances are fetched from
    // different upstream endpoints and written to different tables, so one
    // failing (a host that 404s scheduled-maintenances, say) must never
    // prevent the other from completing or being counted — and running
    // both concurrently instead of one-after-the-other roughly halves this
    // service's share of the poll cycle's wall-clock time.
    const [incidentResult, maintenanceResult] = await Promise.allSettled([
      pollOneServiceIncidents(service),
      pollOneServiceMaintenances(service),
    ]);

    if (incidentResult.status === "fulfilled") {
      const { incidentCount, failed } = incidentResult.value;
      incidentsUpserted += incidentCount - failed;
      failedTotal += failed;
      await backfillIfFirstPoll(service.slug, failed);
    } else {
      failedTotal++;
      // Otherwise a whole service's incident poll failing (bad host
      // response, timeout) is completely invisible — pollAllIncidents's
      // return value is never logged or inspected by its caller.
      console.error(`pollOneServiceIncidents failed for "${service.slug}":`, incidentResult.reason);
    }

    if (maintenanceResult.status === "fulfilled") {
      const { maintenanceCount, failed } = maintenanceResult.value;
      maintenancesUpserted += maintenanceCount - failed;
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
