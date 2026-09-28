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

// Runs on every shard's tick (not behind the shard-0 gate), so overlapping ticks need this lock to avoid double sends.
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

// Deliberately UTC-only: a per-account time zone would cost an Admin API call per due reminder.
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

// Reminder-side equivalent of notifyIncidentEvents.ts's excludedServiceSlugs query filter.
function integrationsEligibleForService(integrationsForUser: IntegrationDefinition[], serviceSlug: string): IntegrationDefinition[] {
  return integrationsForUser.filter((integration) => !integration.excludedServiceSlugs?.includes(serviceSlug));
}

type DeliveryRow = { rule_id: string; service_slug: string; maintenance_id: string; scheduled_for: string };

export async function checkMaintenanceReminders(): Promise<void> {
  const supabase = getSupabaseClient();
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

  // Falls back to the slug so one stale catalog entry can't fail the whole batch.
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

    // Most-specific rule wins, so a per-service rule shadows "all" and never fires both.
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
      if (!rule) continue;

      const prior = priorByKey.get(`${rule.id}:${maintenance.service_slug}:${maintenance.id}`) ?? null;
      if (!isDue(rule, maintenance, prior, nowMsValue)) continue;

      const sendingEarly = isSendingEarly(rule, maintenance, nowMsValue);
      const serviceName = serviceNameBySlug.get(maintenance.service_slug) ?? maintenance.service_slug;
      const content = buildReminderContent(serviceName, maintenance, rule, sendingEarly);

      const eligibleIntegrations = integrationsEligibleForService(integrationsForUser, maintenance.service_slug);
      const results = await Promise.all(rule.channels.map((channel) => sendReminder(channel, eligibleIntegrations, content)));
      // One channel succeeding counts as delivered, or a working channel would resend forever. All failing retries next tick.
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
