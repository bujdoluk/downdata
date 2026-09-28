import { render } from "@react-email/render";
import { getAllIntegrationsAcrossUsers } from "@/features/integrations/services/integrations";
import { getAllTrackedSlugsAcrossUsers } from "@/features/boards/services/boards";
import { getSupabaseClient } from "@/lib/supabase";
import { resolveTimeZone } from "@/lib/account";
import { getResendClient } from "@/features/integrations/services/resend";
import { sendSms as sendSmsMessage } from "@/features/integrations/services/twilio";
import { sendWebhook as sendWebhookRequest } from "@/features/integrations/services/webhook";
import { getStoredIncidentWithUpdates } from "@/lib/getStoredIncident";
import { runInBatches } from "@/lib/runInBatches";
import { nowIso } from "@/lib/formatTime";
import { emailLogoUrl } from "@/lib/emailLogoUrl";
import IncidentNotification from "@/components/emails/IncidentNotification";
import type { IntegrationDefinition } from "@/types/integration";
import type { IncidentComponent } from "@/types/service";
import type { StoredIncident, StoredIncidentUpdate } from "@/lib/getStoredIncident";

type IncidentEvent = {
  id: string | number;
  service_slug: string;
  incident_id: string;
  update_id: string | null;
  event_type: "incident_created" | "update_added";
  occurred_at: string;
};

const SEND_CONCURRENCY = 200;
const BODY_PREVIEW_LENGTH = 300;

// Discriminated union so "update_added" branches can read `update` without a non-null assertion.
export type ResolvedEvent =
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

// Caches the in-flight promise, not the value, so concurrent pairs for the same event never fetch twice.
function resolveEventCached(event: IncidentEvent, cache: Map<IncidentEvent["id"], Promise<ResolvedEvent | null>>): Promise<ResolvedEvent | null> {
  const cached = cache.get(event.id);
  if (cached) return cached;
  const promise = resolveEvent(event);
  cache.set(event.id, promise);
  return promise;
}

// When the event happened, not when this cron cycle sent it (matches IncidentDetail.tsx).
export function eventTimestamp(resolved: ResolvedEvent): string {
  return resolved.type === "incident_created" ? resolved.incident.created_at : resolved.update.created_at;
}

// One Admin API call per account per cycle, email only. Falls back to UTC rather than dropping the notification.
function resolveTimeZoneCached(userId: string, cache: Map<string, Promise<string>>): Promise<string> {
  const cached = cache.get(userId);
  if (cached) return cached;
  const promise = getSupabaseClient()
    .auth.admin.getUserById(userId)
    .then(({ data }) => resolveTimeZone(data.user?.user_metadata.time_zone))
    .catch(() => "UTC");
  cache.set(userId, promise);
  return promise;
}

// Upstream shapes differ per event type (IncidentComponent.id vs AffectedComponent.code).
// See docs/specs/SPEC-component-notification-filters.md, Assumption 6.
export function eventComponentIds(resolved: ResolvedEvent): string[] {
  if (resolved.type === "incident_created") {
    return ((resolved.incident.components as IncidentComponent[] | null) ?? []).map((c) => c.id);
  }
  return (resolved.update.affected_components ?? []).map((c) => c.code);
}

// Fetched once up front, not per pair: per-pair queries at SEND_CONCURRENCY saturated Postgres before (AGENTS.md Failure log).
// Fails open on error, since failing closed would suppress every notification.
async function fetchAllComponentFilters(): Promise<Map<string, Set<string>>> {
  const filters = new Map<string, Set<string>>();
  try {
    const { data } = await getSupabaseClient().from("service_component_filters").select("user_id, service_slug, component_id");
    for (const row of data ?? []) {
      const key = `${row.user_id as string}:${row.service_slug as string}`;
      const set = filters.get(key);
      if (set) set.add(row.component_id as string);
      else filters.set(key, new Set([row.component_id as string]));
    }
  } catch {
    // Empty map means "All components", so failing open needs no recovery.
  }
  return filters;
}

// Events naming no components are never filtered, same rule as HistoryPageContent.tsx.
export function passesComponentFilter(userId: string, serviceSlug: string, resolved: ResolvedEvent, filters: Map<string, Set<string>>): boolean {
  const componentIds = eventComponentIds(resolved);
  if (componentIds.length === 0) return true;

  const allowlist = filters.get(`${userId}:${serviceSlug}`);
  if (!allowlist) return true;

  return componentIds.some((id) => allowlist.has(id));
}

function buildSlackText(serviceSlug: string, resolved: ResolvedEvent): string {
  if (resolved.type === "incident_created") {
    return `🆕 New incident on ${serviceSlug}: *${resolved.incident.name}* (${resolved.incident.impact})`;
  }
  const { body, status } = resolved.update;
  const preview = body.length > BODY_PREVIEW_LENGTH ? `${body.slice(0, BODY_PREVIEW_LENGTH)}…` : body;
  return `*${resolved.incident.name}* on ${serviceSlug} (${status}): ${preview}`;
}

function buildEmailContent(
  serviceSlug: string,
  resolved: ResolvedEvent,
  timeZone: string,
): { subject: string; element: ReturnType<typeof IncidentNotification> } {
  const logoUrl = emailLogoUrl();
  const occurredAt = eventTimestamp(resolved);
  if (resolved.type === "incident_created") {
    return {
      subject: `New incident: ${resolved.incident.name}`,
      element: IncidentNotification({
        logoUrl,
        serviceSlug,
        incidentName: resolved.incident.name,
        impact: resolved.incident.impact,
        status: resolved.incident.status,
        body: null,
        shortlink: resolved.incident.shortlink,
        isNew: true,
        occurredAt,
        timeZone,
      }),
    };
  }
  return {
    subject: `Update on ${resolved.incident.name}`,
    element: IncidentNotification({
      logoUrl,
      serviceSlug,
      incidentName: resolved.incident.name,
      impact: resolved.incident.impact,
      status: resolved.update.status,
      body: resolved.update.body,
      shortlink: resolved.incident.shortlink,
      isNew: false,
      occurredAt,
      timeZone,
    }),
  };
}

function buildSmsBody(serviceSlug: string, resolved: ResolvedEvent): string {
  if (resolved.type === "incident_created") {
    return `downDATA: New incident on ${serviceSlug}: ${resolved.incident.name} (${resolved.incident.impact})`;
  }
  return `downDATA: Update on ${resolved.incident.name} (${resolved.incident.impact}). Status: ${resolved.update.status}. ${resolved.update.body}`;
}

function buildWebhookPayload(serviceSlug: string, resolved: ResolvedEvent) {
  return {
    schemaVersion: 1,
    event: resolved.type === "incident_created" ? "incident.created" : "incident.updated",
    timestamp: nowIso(),
    service: { slug: serviceSlug },
    incident: {
      name: resolved.incident.name,
      impact: resolved.incident.impact,
      status: resolved.type === "incident_created" ? resolved.incident.status : resolved.update.status,
      body: resolved.type === "update_added" ? resolved.update.body : null,
      url: resolved.incident.shortlink,
    },
  };
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

async function sendEmail(
  integration: Extract<IntegrationDefinition, { slug: "email" }>,
  serviceSlug: string,
  resolved: ResolvedEvent,
  timeZone: string,
): Promise<boolean> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from || integration.recipients.length === 0) return false;

  const { subject, element } = buildEmailContent(serviceSlug, resolved, timeZone);
  try {
    const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
    const { error } = await getResendClient().emails.send({
      from: `downDATA <${from}>`,
      to: integration.recipients.map((recipient) => recipient.value),
      subject,
      html,
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

// Partial failure retries the whole integration: a duplicate is acceptable, a dropped event is not.
// Batched because target count per integration is unbounded.
async function sendWebhook(
  integration: Extract<IntegrationDefinition, { slug: "webhook" }>,
  serviceSlug: string,
  resolved: ResolvedEvent,
  validationCache: Map<string, boolean>,
): Promise<boolean> {
  if (integration.targets.length === 0) return false;
  const payload = buildWebhookPayload(serviceSlug, resolved);
  const results: boolean[] = [];
  await runInBatches(integration.targets, SEND_CONCURRENCY, async (target) => {
    results.push(await sendWebhookRequest(target.value, target.secret, payload, validationCache));
  });
  return results.every(Boolean);
}

// Kept apart from sendXxx so their booleans only mean "send succeeded".
// Checks for notifyImpacts generically so new integration types get the filter for free.
function shouldNotify(integration: IntegrationDefinition, resolved: ResolvedEvent): boolean {
  if (!("notifyImpacts" in integration)) return true;
  return integration.notifyImpacts.includes(resolved.incident.impact);
}

async function sendNotification(
  integration: IntegrationDefinition,
  serviceSlug: string,
  resolved: ResolvedEvent,
  webhookValidationCache: Map<string, boolean>,
  userId: string,
  timeZoneCache: Map<string, Promise<string>>,
): Promise<boolean> {
  if (integration.slug === "slack") return sendSlack(integration, serviceSlug, resolved);
  if (integration.slug === "email") return sendEmail(integration, serviceSlug, resolved, await resolveTimeZoneCached(userId, timeZoneCache));
  if (integration.slug === "webhook") return sendWebhook(integration, serviceSlug, resolved, webhookValidationCache);
  return sendSms(integration, serviceSlug, resolved);
}

export async function notifyPendingEvents(): Promise<void> {
  const supabase = getSupabaseClient();

  // Cross-account service-role reads: cron has no session for the RLS helpers. Never reuse outside cron.
  const integrationsByUser = await getAllIntegrationsAcrossUsers();
  if (integrationsByUser.length === 0) return;

  const trackedSlugsByUser = await getAllTrackedSlugsAcrossUsers();
  if (trackedSlugsByUser.size === 0) return;

  // Narrowed in the query (anti-join on deliveries) so delivered rows are never re-read.
  // Batched: an unbounded burst of concurrent Supabase queries here saturated Postgres before (AGENTS.md Failure log).
  const pairs: { integration: IntegrationDefinition; event: IncidentEvent; userId: string }[] = [];
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
    for (const event of (events as IncidentEvent[] | null) ?? []) pairs.push({ integration, event, userId });
  });
  if (pairs.length === 0) return;

  const sent: { event_id: string | number; integration_id: string }[] = [];
  const resolvedCache = new Map<IncidentEvent["id"], Promise<ResolvedEvent | null>>();
  const webhookValidationCache = new Map<string, boolean>();
  const timeZoneCache = new Map<string, Promise<string>>();
  const componentFilters = await fetchAllComponentFilters();
  await runInBatches(pairs, SEND_CONCURRENCY, async ({ integration, event, userId }) => {
    const resolved = await resolveEventCached(event, resolvedCache);
    if (!resolved) return;

    // Filtered events are marked handled, or they'd retry forever.
    if (!shouldNotify(integration, resolved)) {
      sent.push({ event_id: event.id, integration_id: integration.id });
      return;
    }
    if (!passesComponentFilter(userId, event.service_slug, resolved, componentFilters)) {
      sent.push({ event_id: event.id, integration_id: integration.id });
      return;
    }

    // Recorded only on success, so failed sends retry next cycle.
    if (await sendNotification(integration, event.service_slug, resolved, webhookValidationCache, userId, timeZoneCache)) {
      sent.push({ event_id: event.id, integration_id: integration.id });
    }
  });

  if (sent.length > 0) {
    await supabase.from("incident_event_deliveries").upsert(sent, { onConflict: "event_id,integration_id", ignoreDuplicates: true });
  }
}
