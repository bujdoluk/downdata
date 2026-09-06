import { getAllIntegrationsAcrossUsers } from "@/lib/integrations";
import { getAllTrackedSlugsAcrossUsers } from "@/lib/boards";
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

// The same event can now be pending for several (integration, account)
// pairs at once — cache by event id so its incident/updates only get
// fetched once per cycle. Storing the in-flight promise (not just the
// resolved value) is what makes this race-free across concurrent pairs
// for the same event: resolveEventCached runs synchronously up to its
// first await, so a second pair for the same event always finds the
// first pair's promise already cached, never starts a duplicate fetch.
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
  // getAllIntegrationsAcrossUsers() only ever returns verified recipients
  // — an integration with none yet (freshly connected, nothing confirmed)
  // has nothing to send to.
  if (!from || integration.recipients.length === 0) return false;

  const { subject, text } = buildEmailContent(serviceSlug, resolved);
  try {
    const { error } = await getResendClient().emails.send({
      from,
      to: integration.recipients.map((recipient) => recipient.value),
      subject,
      text,
    });
    return !error;
  } catch {
    return false;
  }
}

async function sendSms(integration: Extract<IntegrationDefinition, { slug: "sms" }>, serviceSlug: string, resolved: ResolvedEvent): Promise<boolean> {
  if (integration.recipients.length === 0) return false;
  try {
    return await sendSmsMessage({
      to: integration.recipients.map((recipient) => recipient.value),
      body: buildSmsBody(serviceSlug, resolved),
    });
  } catch {
    return false;
  }
}

// Per-integration policy filter — kept separate from the sendXxx
// functions above so their booleans keep meaning exactly one thing (did
// the send succeed), not "succeeded, or was never applicable." Per-service
// targeting (integration.excludedServiceSlugs) is handled further up, in
// the query that decides which events are even pending for an integration
// in the first place — narrower query, not a post-hoc filter — so the only
// thing left here is sms's severity filter.
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

  // Both service-role-backed, cross-account reads — this runs from a
  // cron tick (CRON_SECRET-gated), not a login, so there's no session for
  // the per-user, RLS-scoped helpers (lib/boards.ts's getAllTrackedSlugs,
  // lib/integrations.ts's getAllIntegrations) to scope against. Never
  // reuse these two outside this cron path — see the "never call this
  // from a user-facing code path" note on each.
  const integrationsByUser = await getAllIntegrationsAcrossUsers();
  if (integrationsByUser.length === 0) return;

  const trackedSlugsByUser = await getAllTrackedSlugsAcrossUsers();
  if (trackedSlugsByUser.size === 0) return;

  // One query per (integration, account) pair, each scoped to exactly
  // that account's own tracked services — minus whichever ones the
  // integration's own excluded_service_slugs list turns off, if any —
  // and to events that specific integration hasn't been delivered yet (the
  // `!left` + `.is(..., null)` anti-join pair). Narrowing the target set
  // in the query itself, rather than fetching broadly and filtering in
  // JS, is what keeps this from re-reading the same already-delivered
  // rows forever as the tracked/integration set grows.
  //
  // Batched through runInBatches (same SEND_CONCURRENCY cap as the send
  // loop below), not a raw Promise.all — this fan-out now scales with
  // accounts × integrations per account instead of a fixed ≤3 global
  // integrations, and an unbounded burst of concurrent Supabase queries
  // here is exactly the shape of load that already saturated this
  // project's Postgres compute once before the poller was sharded (see
  // AGENTS.md's Failure log).
  const pairs: { integration: IntegrationDefinition; event: IncidentEvent }[] = [];
  await runInBatches(integrationsByUser, SEND_CONCURRENCY, async ({ integration, userId }) => {
    const ownTracked = trackedSlugsByUser.get(userId);
    if (!ownTracked?.size) return;

    const excluded = new Set(integration.excludedServiceSlugs ?? []);
    const targetSlugs = [...ownTracked].filter((slug) => !excluded.has(slug));
    if (targetSlugs.length === 0) return;

    const { data: events } = await supabase
      .from("incident_events")
      .select("*, incident_event_deliveries!left(event_id)")
      .in("service_slug", targetSlugs)
      .eq("incident_event_deliveries.integration_id", integration.id)
      .is("incident_event_deliveries.event_id", null)
      .order("occurred_at", { ascending: true })
      .limit(1000);
    for (const event of (events as IncidentEvent[] | null) ?? []) pairs.push({ integration, event });
  });
  if (pairs.length === 0) return;

  const sent: { event_id: string | number; integration_id: string }[] = [];
  const resolvedCache = new Map<IncidentEvent["id"], Promise<ResolvedEvent | null>>();
  await runInBatches(pairs, SEND_CONCURRENCY, async ({ integration, event }) => {
    const resolved = await resolveEventCached(event, resolvedCache);
    if (!resolved) return;

    // Excluded by the integration's own policy filter (sms's
    // notifyImpacts) — not a delivery outcome, so it's marked handled the
    // same as an actual send would be, or it would retry forever.
    if (!shouldNotify(integration, resolved)) {
      sent.push({ event_id: event.id, integration_id: integration.id });
      return;
    }

    // Only recorded as delivered on actual success — a failed send is
    // therefore automatically retried next cycle, for free, with no queue.
    if (await sendNotification(integration, event.service_slug, resolved)) {
      sent.push({ event_id: event.id, integration_id: integration.id });
    }
  });

  if (sent.length > 0) {
    await supabase.from("incident_event_deliveries").upsert(sent, { onConflict: "event_id,integration_id", ignoreDuplicates: true });
  }
}
