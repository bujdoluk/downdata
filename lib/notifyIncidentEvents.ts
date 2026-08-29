import { getAllIntegrations } from "@/lib/integrations";
import { getAllServices } from "@/lib/services";
import { getSupabaseClient } from "@/lib/supabase";
import { getResendClient } from "@/lib/resend";
import { sendSms as sendSmsMessage } from "@/lib/twilio";
import { getStoredIncidentWithUpdates } from "@/lib/getStoredIncident";
import { runInBatches } from "@/lib/runInBatches";
import type { IntegrationDefinition } from "@/types/integration";
import type { StoredIncident, StoredIncidentUpdate } from "@/lib/getStoredIncident";

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

// Discriminated on event type (not a bare `update: StoredIncidentUpdate |
// null`) so the formatters below can read `resolved.update` in the
// "update_added" branch without a non-null assertion — resolveEvent
// itself is the one place that guarantees the update actually exists.
type ResolvedEvent =
  | { type: "incident_created"; incident: StoredIncident }
  | { type: "update_added"; incident: StoredIncident; update: StoredIncidentUpdate };

async function resolveEvent(event: IncidentEvent): Promise<ResolvedEvent | null> {
  const incident = await getStoredIncidentWithUpdates(event.service_slug, event.incident_id);
  if (!incident) return null;

  if (event.event_type === "incident_created") {
    return { type: "incident_created", incident };
  }

  const update = incident.incident_updates.find((u) => u.id === event.update_id);
  if (!update) return null;
  return { type: "update_added", incident, update };
}

// Now that an event can be pending for more than one integration (Slack
// and email both connected), the same event shows up in `pairs` once per
// integration — cache by event id so its incident/updates only get
// fetched once per cycle, not once per (event, integration) pair. Storing
// the in-flight promise (not just the resolved value) is what makes this
// race-free across concurrent pairs for the same event: resolveEventCached
// runs synchronously up to its first await, so a second pair for the same
// event always finds the first pair's promise already cached, never
// starts a duplicate fetch.
function resolveEventCached(event: IncidentEvent, cache: Map<IncidentEvent["id"], Promise<ResolvedEvent | null>>): Promise<ResolvedEvent | null> {
  const cached = cache.get(event.id);
  if (cached) return cached;
  const promise = resolveEvent(event);
  cache.set(event.id, promise);
  return promise;
}

function buildSlackText(serviceSlug: string, resolved: ResolvedEvent): string {
  if (resolved.type === "incident_created") {
    return `🆕 New incident on ${serviceSlug}: *${resolved.incident.name}* (${resolved.incident.impact})`;
  }
  const { body, status } = resolved.update;
  const preview = body.length > BODY_PREVIEW_LENGTH ? `${body.slice(0, BODY_PREVIEW_LENGTH)}…` : body;
  return `${serviceSlug} — *${resolved.incident.name}* (${status}): ${preview}`;
}

function buildEmailContent(serviceSlug: string, resolved: ResolvedEvent): { subject: string; text: string } {
  if (resolved.type === "incident_created") {
    return {
      subject: `New incident: ${resolved.incident.name}`,
      text: `${serviceSlug} — ${resolved.incident.name} (${resolved.incident.impact})`,
    };
  }
  return {
    subject: `Update on ${resolved.incident.name}`,
    text: `${serviceSlug} — ${resolved.incident.name} (${resolved.update.status}): ${resolved.update.body}`,
  };
}

function buildSmsBody(serviceSlug: string, resolved: ResolvedEvent): string {
  if (resolved.type === "incident_created") {
    return `downDATA: New incident — ${resolved.incident.name} (${resolved.incident.impact}) on ${serviceSlug}`;
  }
  return `downDATA: Update on ${resolved.incident.name} (${resolved.incident.impact}) — ${resolved.update.status}: ${resolved.update.body}`;
}

async function sendSlack(integration: Extract<IntegrationDefinition, { slug: "slack" }>, serviceSlug: string, resolved: ResolvedEvent): Promise<boolean> {
  try {
    const res = await fetch(integration.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: buildSlackText(serviceSlug, resolved) }),
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendEmail(integration: Extract<IntegrationDefinition, { slug: "email" }>, serviceSlug: string, resolved: ResolvedEvent): Promise<boolean> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) return false;

  const { subject, text } = buildEmailContent(serviceSlug, resolved);
  try {
    const { error } = await getResendClient().emails.send({ from, to: integration.recipientEmails, subject, text });
    return !error;
  } catch {
    return false;
  }
}

async function sendSms(integration: Extract<IntegrationDefinition, { slug: "sms" }>, serviceSlug: string, resolved: ResolvedEvent): Promise<boolean> {
  try {
    return await sendSmsMessage({ to: integration.recipientPhones, body: buildSmsBody(serviceSlug, resolved) });
  } catch {
    return false;
  }
}

// Per-integration policy filter — kept separate from the sendXxx
// functions above so their booleans keep meaning exactly one thing (did
// the send succeed), not "succeeded, or was never applicable." Only sms
// has a filter today (notifyImpacts), but any future per-integration
// filter (e.g. a quiet-hours window) would plug in here rather than
// inside a specific channel's send function.
function shouldNotify(integration: IntegrationDefinition, resolved: ResolvedEvent): boolean {
  if (integration.slug !== "sms") return true;
  return integration.notifyImpacts.includes(resolved.incident.impact);
}

async function sendNotification(integration: IntegrationDefinition, serviceSlug: string, resolved: ResolvedEvent): Promise<boolean> {
  if (integration.slug === "slack") return sendSlack(integration, serviceSlug, resolved);
  if (integration.slug === "email") return sendEmail(integration, serviceSlug, resolved);
  return sendSms(integration, serviceSlug, resolved);
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
  const resolvedCache = new Map<IncidentEvent["id"], Promise<ResolvedEvent | null>>();
  await runInBatches(pairs, SEND_CONCURRENCY, async ({ integration, event }) => {
    const resolved = await resolveEventCached(event, resolvedCache);
    if (!resolved) return;

    // Excluded by the integration's own policy filter (sms's
    // notifyImpacts today) — not a delivery outcome, so it's marked
    // handled the same as an actual send would be, or it would retry
    // forever.
    if (!shouldNotify(integration, resolved)) {
      sent.push({ event_id: event.id, integration_slug: integration.slug });
      return;
    }

    // Only recorded as delivered on actual success — a failed send is
    // therefore automatically retried next cycle, for free, with no queue.
    if (await sendNotification(integration, event.service_slug, resolved)) {
      sent.push({ event_id: event.id, integration_slug: integration.slug });
    }
  });

  if (sent.length > 0) {
    await supabase.from("incident_event_deliveries").upsert(sent, { onConflict: "event_id,integration_slug", ignoreDuplicates: true });
  }
}
