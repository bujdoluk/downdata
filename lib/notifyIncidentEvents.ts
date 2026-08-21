import { getAllIntegrations } from "@/lib/integrations";
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

  // No time-window cutoff — that would silently drop anything older than
  // the window if a cycle is ever delayed. Oldest-first with a bounded
  // limit instead: a huge backlog just takes a few extra 1-minute cycles
  // to clear, nothing is ever dropped. The delivery anti-join below is
  // what actually guarantees "already handled" per channel.
  const { data: events } = await supabase
    .from("incident_events")
    .select("*")
    .order("occurred_at", { ascending: true })
    .limit(1000);
  if (!events?.length) return;

  const { data: deliveries } = await supabase
    .from("incident_event_deliveries")
    .select("event_id, integration_slug")
    .in(
      "event_id",
      events.map((event) => event.id),
    );
  const delivered = new Set((deliveries ?? []).map((delivery) => `${delivery.event_id}:${delivery.integration_slug}`));

  const pairs = integrations.flatMap((integration) =>
    (events as IncidentEvent[])
      .filter((event) => !delivered.has(`${event.id}:${integration.slug}`))
      .map((event) => ({ integration, event })),
  );

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
