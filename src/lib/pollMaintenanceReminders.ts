import { getSupabaseClient } from "@/lib/supabase";
import { getCatalog } from "@/lib/catalog";
import { LOCK_STALE_MS } from "@/lib/pollIncidents";
import { getAllTrackedSlugsAcrossUsers } from "@/features/boards/services/boards";
import { getAllReminderRulesAcrossUsers } from "@/features/maintenance/services/maintenanceReminders";
import { resolveRuleForService } from "@/features/maintenance/services/resolveReminderRule";
import { isDue, isSendingEarly } from "@/lib/maintenanceReminderScan";
import { getAllStoredMaintenances, type StoredMaintenance } from "@/features/maintenance/services/getStoredMaintenance";
import { getAllIntegrationsAcrossUsers } from "@/features/integrations/services/integrations";
import { getResendClient } from "@/features/integrations/services/resend";
import { sendSms as sendSmsMessage } from "@/features/integrations/services/twilio";
import { runInBatches } from "@/lib/runInBatches";
import { nowMs, nowIso, isoFromEpochMs, formatDateTime } from "@/lib/formatTime";
import { formatMinutesShort } from "@/lib/reminderDuration";
import type { MaintenanceReminderRule, ReminderChannel } from "@/features/maintenance/types";
import type { IntegrationDefinition } from "@/types/integration";

const CHECK_CONCURRENCY = 50;

// Its own row in the same poll_run_lock table pollIncidents.ts's route
// already uses, same atomic UPDATE...RETURNING claim pattern (see that
// route's own comment on why: PostgREST/supabase-js gives no guarantee a
// later "unlock" call lands on the same session as an earlier "lock" one,
// which session-scoped advisory locks would need). Needed because
// checkMaintenanceReminders() is now called from *every* shard's own
// after() callback, not gated to shard 0 like it used to be (see
// AGENTS.md's Failure log on why that gate gave the wrong cadence) — each
// shard has its own independent poll_run_lock row, so nothing before this
// stopped two shard ticks whose wall-clock work genuinely overlapped from
// both claiming "this reminder is due" and sending it twice.
const REMINDER_LOCK_KEY = "maintenance-reminders";

async function claimReminderLock(supabase: ReturnType<typeof getSupabaseClient>): Promise<boolean> {
  await supabase.from("poll_run_lock").upsert({ shard_key: REMINDER_LOCK_KEY }, { onConflict: "shard_key", ignoreDuplicates: true });
  const staleBefore = isoFromEpochMs(nowMs() - LOCK_STALE_MS);
  const { data: claimed } = await supabase
    .from("poll_run_lock")
    .update({ running: true, started_at: nowIso() })
    .eq("shard_key", REMINDER_LOCK_KEY)
    .or(`running.eq.false,started_at.lt.${staleBefore}`)
    .select();
  return !!claimed?.length;
}

// This app has no i18n story for server-sent notification bodies
// (Slack/email/SMS content is never rendered through react-i18next), same
// as lib/notifyIncidentEvents.ts's own message builders — formatDateTime
// itself is locale-agnostic (Temporal's toLocaleString with no explicit
// locale), so the "English-only" part is really just the surrounding
// sentence structure below. Formats the time in UTC rather than the
// account's own time zone: resolving a *different* account's saved time
// zone from a cron context needs the Supabase admin API
// (auth.admin.getUserById) per account with a due reminder, which is a
// real added cost for a "nicer clock label" — not built without evidence
// it's worth that.
function formatStartTime(scheduledFor: string): string {
  return `${formatDateTime(scheduledFor, "UTC")} UTC`;
}

type ReminderContent = { subject: string; body: string; smsBody: string };

function buildReminderContent(serviceName: string, maintenance: StoredMaintenance, rule: MaintenanceReminderRule, sendingEarly: boolean): ReminderContent {
  const startTime = formatStartTime(maintenance.scheduled_for);
  if (sendingEarly) {
    return {
      subject: `Maintenance starting soon: ${maintenance.name}`,
      body: `${serviceName}'s maintenance starts ${startTime}. That's sooner than your ${formatMinutesShort(rule.minutesBefore)} reminder window, so you're getting this now instead.`,
      smsBody: `${serviceName} maintenance starts ${startTime}. Earlier than your ${formatMinutesShort(rule.minutesBefore)} reminder setting.`,
    };
  }
  return {
    subject: `Upcoming maintenance: ${maintenance.name}`,
    body: `${serviceName} has maintenance starting in ${formatMinutesShort(rule.minutesBefore)}: ${startTime}. ${maintenance.name}`,
    smsBody: `${serviceName} maintenance starts in ${formatMinutesShort(rule.minutesBefore)} (${startTime}).`,
  };
}

async function sendSlackReminder(integration: Extract<IntegrationDefinition, { slug: "slack" }>, content: ReminderContent): Promise<boolean> {
  try {
    const res = await fetch(integration.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `⏰ ${content.body}` }),
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendEmailReminder(integration: Extract<IntegrationDefinition, { slug: "email" }>, content: ReminderContent): Promise<boolean> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from || integration.recipients.length === 0) return false;
  try {
    const { error } = await getResendClient().emails.send({
      from: `downDATA <${from}>`,
      to: integration.recipients.map((recipient) => recipient.value),
      subject: content.subject,
      text: content.body,
      html: `<p>${content.body}</p>`,
    });
    return !error;
  } catch {
    return false;
  }
}

async function sendSmsReminder(integration: Extract<IntegrationDefinition, { slug: "sms" }>, content: ReminderContent): Promise<boolean> {
  if (integration.recipients.length === 0) return false;
  try {
    return await sendSmsMessage({ to: integration.recipients.map((recipient) => recipient.value), body: content.smsBody });
  } catch {
    return false;
  }
}

async function sendReminder(
  channel: ReminderChannel,
  integrationsForUser: IntegrationDefinition[],
  content: ReminderContent,
): Promise<boolean> {
  const integration = integrationsForUser.find((candidate) => candidate.slug === channel);
  if (!integration) return false;
  if (integration.slug === "slack") return sendSlackReminder(integration, content);
  if (integration.slug === "email") return sendEmailReminder(integration, content);
  if (integration.slug === "sms") return sendSmsReminder(integration, content);
  return false;
}

// notifyIncidentEvents.ts already narrows *which events are even pending*
// for an integration by this same list before it ever gets here (see that
// file's own query) — this is the reminder scan's equivalent, applied per
// maintenance since one integration can be eligible for one service's
// reminder and excluded from another's.
function integrationsEligibleForService(integrationsForUser: IntegrationDefinition[], serviceSlug: string): IntegrationDefinition[] {
  return integrationsForUser.filter((integration) => !integration.excludedServiceSlugs?.includes(serviceSlug));
}

type DeliveryRow = { rule_id: string; service_slug: string; maintenance_id: string; scheduled_for: string };

export async function checkMaintenanceReminders(): Promise<void> {
  const supabase = getSupabaseClient();
  // Skips this tick entirely (not an error) if another invocation — from
  // this same shard's previous run, or a different shard whose tick
  // genuinely overlapped in wall-clock time — is still in flight or holds
  // a not-yet-stale claim. See REMINDER_LOCK_KEY's own comment.
  if (!(await claimReminderLock(supabase))) return;

  try {
    await checkMaintenanceRemindersUnlocked(supabase);
  } finally {
    await supabase.from("poll_run_lock").update({ running: false }).eq("shard_key", REMINDER_LOCK_KEY);
  }
}

async function checkMaintenanceRemindersUnlocked(supabase: ReturnType<typeof getSupabaseClient>): Promise<void> {
  const rulesByUser = await getAllReminderRulesAcrossUsers();
  if (rulesByUser.size === 0) return;

  // Display names for the notification bodies — StoredMaintenance only
  // carries service_slug (e.g. "github"), never a human-readable name.
  // Falls back to the raw slug for the (should-be-impossible) case of a
  // service that's tracked/reminded-about but has since dropped out of
  // the catalog, rather than throwing and losing every other account's
  // reminders in the same batch over one stale slug.
  const catalog = await getCatalog();
  const serviceNameBySlug = new Map(catalog.map((entry) => [entry.slug, entry.name]));

  const trackedSlugsByUser = await getAllTrackedSlugsAcrossUsers();
  const integrationsByUser = await getAllIntegrationsAcrossUsers();
  const integrationsGrouped = new Map<string, IntegrationDefinition[]>();
  for (const { integration, userId } of integrationsByUser) {
    const list = integrationsGrouped.get(userId) ?? [];
    list.push(integration);
    integrationsGrouped.set(userId, list);
  }

  const nowMsValue = nowMs();
  const upserts: (DeliveryRow & { sent_early: boolean })[] = [];

  await runInBatches([...rulesByUser.entries()], CHECK_CONCURRENCY, async ([userId, rules]) => {
    const tracked = trackedSlugsByUser.get(userId);
    if (!tracked?.size) return;

    // Only the slugs some rule actually covers — resolveRuleForService is
    // most-specific-wins, so a per-service rule silently shadows the
    // account's own "all" rule for that same service here too, never
    // firing both.
    const coveredSlugs = [...tracked].filter((slug) => resolveRuleForService(rules, slug) !== null);
    if (coveredSlugs.length === 0) return;

    const maintenances = await getAllStoredMaintenances(coveredSlugs);
    if (maintenances.length === 0) return;

    const ruleIds = [...new Set(rules.map((rule) => rule.id))];
    const { data: priorDeliveries } = await supabase
      .from("maintenance_reminder_deliveries")
      .select("rule_id, service_slug, maintenance_id, scheduled_for")
      .in("rule_id", ruleIds);
    const priorByKey = new Map<string, { scheduledFor: string }>();
    for (const row of (priorDeliveries as DeliveryRow[] | null) ?? []) {
      priorByKey.set(`${row.rule_id}:${row.service_slug}:${row.maintenance_id}`, { scheduledFor: row.scheduled_for });
    }

    const integrationsForUser = integrationsGrouped.get(userId) ?? [];

    for (const maintenance of maintenances) {
      const rule = resolveRuleForService(rules, maintenance.service_slug);
      if (!rule) continue; // shouldn't happen — maintenance came from coveredSlugs — but guards the ! below honestly

      const prior = priorByKey.get(`${rule.id}:${maintenance.service_slug}:${maintenance.id}`) ?? null;
      if (!isDue(rule, maintenance, prior, nowMsValue)) continue;

      const sendingEarly = isSendingEarly(rule, maintenance, nowMsValue);
      const serviceName = serviceNameBySlug.get(maintenance.service_slug) ?? maintenance.service_slug;
      const content = buildReminderContent(serviceName, maintenance, rule, sendingEarly);

      // Same per-service exclusion list notifyIncidentEvents.ts already
      // respects (excludedServiceSlugs) — an integration that's muted for
      // this service shouldn't fire a maintenance reminder for it either,
      // even though the reminder rule itself covers the service.
      const eligibleIntegrations = integrationsEligibleForService(integrationsForUser, maintenance.service_slug);
      const results = await Promise.all(rule.channels.map((channel) => sendReminder(channel, eligibleIntegrations, content)));
      // At least one channel getting through is enough to mark this
      // delivered — the alternative (require every selected channel to
      // succeed) would retry an already-delivered Slack message forever
      // just because, say, the account's email integration has no
      // verified recipient yet. A fully-failed attempt (every channel
      // false) retries next tick instead, same "retry by omission"
      // policy notifyIncidentEvents.ts already uses.
      if (results.some(Boolean)) {
        upserts.push({
          rule_id: rule.id,
          service_slug: maintenance.service_slug,
          maintenance_id: maintenance.id,
          scheduled_for: maintenance.scheduled_for,
          sent_early: sendingEarly,
        });
      }
    }
  });

  if (upserts.length > 0) {
    await supabase.from("maintenance_reminder_deliveries").upsert(upserts, { onConflict: "rule_id,service_slug,maintenance_id" });
  }
}
