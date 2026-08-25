import { getAllIntegrations } from "@/lib/integrations";
import { getAllServices } from "@/lib/services";
import { getSupabaseClient } from "@/lib/supabase";
import { getStoredIncidentWithUpdates } from "@/lib/getStoredIncident";
import { runInBatches } from "@/lib/runInBatches";
import type { IntegrationDefinition } from "@/types/integration";

type IncidentEvent = {
  // bigint columns can come back from PostgREST as strings rather than
  // numbers — don't assume `number` here.
  id: string | number;
  service_slug: string;
  incident_id: string;
  update_id: string | null;
  event_type: "incident_created" | "update_added";
  occurred_at: string;
};

const SEND_CONCURRENCY = 200;
const BODY_PREVIEW_LENGTH = 300;

async function buildMessage(event: IncidentEvent): Promise<string | null> {
  const incident = await getStoredIncidentWithUpdates(event.service_slug, event.incident_id);
  if (!incident) return null;

  if (event.event_type === "incident_created") {
    return `🆕 New incident on ${event.service_slug}: *${incident.name}* (${incident.impact})`;
  }

  const update = incident.incident_updates.find((u) => u.id === event.update_id);
  if (!update) return null;
  const preview = update.body.length > BODY_PREVIEW_LENGTH ? `${update.body.slice(0, BODY_PREVIEW_LENGTH)}…` : update.body;
  return `${event.service_slug} — *${incident.name}* (${update.status}): ${preview}`;
}

// Only Slack exists today — this is the one place a second channel
// (PagerDuty/Datadog/email/...) would get its own branch later.
async function sendNotification(integration: IntegrationDefinition, event: IncidentEvent): Promise<boolean> {
  if (integration.slug !== "slack") return false;

  const text = await buildMessage(event);
  if (!text) return false;

  try {
    const res = await fetch(integration.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function notifyPendingEvents(): Promise<void> {
  const supabase = getSupabaseClient();
  const integrations = await getAllIntegrations();
  if (integrations.length === 0) return;

  // Catalog-wide polling means incident_events now spans every polled
  // host, not just tracked ones — scope to tracked slugs *in the query*
  // (not after fetching) so an untracked-host backlog can never crowd
  // tracked events out of the 1000-row window below.
  const trackedSlugs = (await getAllServices()).map((service) => service.slug);
  if (trackedSlugs.length === 0) return;

  // One query per integration, each scoped to events that specific
  // integration hasn't been delivered yet — a left-join anti-join via
  // PostgREST embedding (the `!left` + `.is(..., null)` pair), not a
  // second deliveries query diffed in JS. That older shape fetched the
  // oldest 1000 *tracked* events every single cycle regardless of
  // delivery status: harmless while the tracked backlog was small, but it
  // meant re-reading the same already-delivered rows forever, and once
  // that backlog passed 1000 rows nothing newer could ever surface again
  // (the query never advanced past the oldest page). Filtering "pending"
  // into the query itself fixes both — a caught-up integration reads
  // ~nothing per cycle, and the result is bounded by actual backlog, not
  // total history. No time-window cutoff still, for the same reason as
  // before: a huge backlog just takes a few extra cycles to clear, nothing
  // is ever silently dropped.
  const pairs = (
    await Promise.all(
      integrations.map(async (integration) => {
        const { data: events } = await supabase
          .from("incident_events")
          .select("*, incident_event_deliveries!left(event_id)")
          .in("service_slug", trackedSlugs)
          .eq("incident_event_deliveries.integration_slug", integration.slug)
          .is("incident_event_deliveries.event_id", null)
          .order("occurred_at", { ascending: true })
          .limit(1000);
        return (events as IncidentEvent[] | null)?.map((event) => ({ integration, event })) ?? [];
      }),
    )
  ).flat();
  if (pairs.length === 0) return;

  const sent: { event_id: string | number; integration_slug: string }[] = [];
  await runInBatches(pairs, SEND_CONCURRENCY, async ({ integration, event }) => {
    // Only recorded as delivered on actual success — a failed send is
    // therefore automatically retried next cycle, for free, with no queue.
    if (await sendNotification(integration, event)) {
      sent.push({ event_id: event.id, integration_slug: integration.slug });
    }
  });

  if (sent.length > 0) {
    await supabase.from("incident_event_deliveries").upsert(sent, { onConflict: "event_id,integration_slug", ignoreDuplicates: true });
  }
}
