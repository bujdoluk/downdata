import { createClient } from "@/lib/supabase/server";
import { getSupabaseClient } from "@/lib/supabase";
import { nowIso, nowPlusIso } from "@/lib/formatTime";
import type { IntegrationDefinition, Recipient } from "@/types/integration";

const SMS_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

type IntegrationRow = {
  id: string;
  slug: string;
  name: string;
  webhook_url: string | null;
  notify_impacts: string[] | null;
  excluded_service_slugs: string[] | null;
};

type RecipientRow = { integration_id: string; value: string; verified: boolean };

function toIntegration(row: IntegrationRow, recipients: Recipient[]): IntegrationDefinition | null {
  if (row.slug === "slack" && row.webhook_url) {
    return { id: row.id, slug: "slack", name: row.name, webhookUrl: row.webhook_url, excludedServiceSlugs: row.excluded_service_slugs };
  }
  if (row.slug === "email") {
    return { id: row.id, slug: "email", name: row.name, recipients, excludedServiceSlugs: row.excluded_service_slugs };
  }
  if (row.slug === "sms") {
    return {
      id: row.id,
      slug: "sms",
      name: row.name,
      recipients,
      notifyImpacts: row.notify_impacts ?? ["major", "critical"],
      excludedServiceSlugs: row.excluded_service_slugs,
    };
  }
  return null;
}

async function recipientsByIntegration(
  supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof getSupabaseClient>,
  integrationIds: string[],
  onlyVerified: boolean,
): Promise<Map<string, Recipient[]>> {
  if (integrationIds.length === 0) return new Map();

  let query = supabase.from("integration_recipients").select("integration_id, value, verified").in("integration_id", integrationIds);
  if (onlyVerified) query = query.eq("verified", true);
  const { data, error } = await query;
  if (error) throw error;

  const byIntegration = new Map<string, Recipient[]>();
  for (const row of (data as RecipientRow[] | null) ?? []) {
    const list = byIntegration.get(row.integration_id) ?? [];
    list.push({ value: row.value, verified: row.verified });
    byIntegration.set(row.integration_id, list);
  }
  return byIntegration;
}

export async function getAllIntegrations(): Promise<IntegrationDefinition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("integrations").select("id, slug, name, webhook_url, notify_impacts, excluded_service_slugs");
  if (error) throw error;
  const rows = (data as IntegrationRow[] | null) ?? [];
  if (rows.length === 0) return [];

  const recipients = await recipientsByIntegration(
    supabase,
    rows.map((row) => row.id),
    false,
  );
  return rows.flatMap((row) => {
    const integration = toIntegration(row, recipients.get(row.id) ?? []);
    return integration ? [integration] : [];
  });
}

// Every account's integrations, tagged with their owner — service-role
// client, for exactly one caller: the cron notifier
// (lib/notifyIncidentEvents.ts), which runs with no user session. Only
// ever includes verified recipients, since the notifier should never see
// (and so can never accidentally send to) an unconfirmed one. Never call
// this from a user-facing code path — it bypasses RLS entirely and would
// leak every account's connections.
export async function getAllIntegrationsAcrossUsers(): Promise<{ integration: IntegrationDefinition; userId: string }[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("id, user_id, slug, name, webhook_url, notify_impacts, excluded_service_slugs");
  if (error) throw error;
  const rows = (data as (IntegrationRow & { user_id: string })[] | null) ?? [];
  if (rows.length === 0) return [];

  const recipients = await recipientsByIntegration(
    supabase,
    rows.map((row) => row.id),
    true,
  );
  return rows.flatMap((row) => {
    const integration = toIntegration(row, recipients.get(row.id) ?? []);
    return integration ? [{ integration, userId: row.user_id }] : [];
  });
}

// A targeted point query rather than getAllIntegrations().find(...) — this
// only needs one row's id/slug, not every recipient of every integration
// the account has (getAllIntegrations() joins the whole recipients table).
export async function resolveIntegrationBySlug(slug: string): Promise<{ id: string; slug: string } | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("integrations").select("id, slug").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

export async function addIntegration(
  input:
    | { slug: "slack"; name: string; webhookUrl: string }
    | { slug: "email"; name: string }
    | { slug: "sms"; name: string; notifyImpacts: string[] },
): Promise<{ id: string; slug: string }> {
  const supabase = await createClient();
  // Built as one concrete row type (not left as the union `input` itself
  // is) — upsert()'s overloads reject a row typed as a union of two
  // shapes even when each member is individually valid.
  const row: { slug: string; name: string; webhook_url?: string; notify_impacts?: string[] } =
    input.slug === "slack"
      ? { slug: input.slug, name: input.name, webhook_url: input.webhookUrl }
      : input.slug === "sms"
        ? { slug: input.slug, name: input.name, notify_impacts: input.notifyImpacts }
        : { slug: input.slug, name: input.name };
  const { data, error } = await supabase.from("integrations").upsert(row, { onConflict: "user_id,slug" }).select("id, slug").single();
  if (error) throw error;
  return data as { id: string; slug: string };
}

// A targeted point query rather than getAllIntegrations().some(...) — this
// only needs to know whether a slug is connected, not read/parse every
// column of every row.
export async function integrationExists(slug: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("integrations").select("id").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function updateSmsNotifyImpacts(id: string, notifyImpacts: string[]): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("integrations").update({ notify_impacts: notifyImpacts }).eq("id", id);
  if (error) throw error;
}

export async function removeIntegration(slug: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("integrations").delete().eq("slug", slug).select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function currentExcludedSlugs(id: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("integrations").select("excluded_service_slugs").eq("id", id).single();
  if (error) throw error;
  return (data as { excluded_service_slugs: string[] | null }).excluded_service_slugs ?? [];
}

// Turns this service's notifications ON — un-excludes it. Because
// excluded_service_slugs is an exclusion list (see the migration comment
// on the column), this never needs to know what else the account tracks:
// removing one slug from the exclusion list can't disturb any other
// service, present or future.
export async function addServiceToIntegrationTarget(id: string, slug: string): Promise<void> {
  const excluded = await currentExcludedSlugs(id);
  if (!excluded.includes(slug)) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("integrations")
    .update({ excluded_service_slugs: excluded.filter((s) => s !== slug) })
    .eq("id", id);
  if (error) throw error;
}

// Turns this service's notifications OFF — excludes it. A plain append;
// same "never needs to know what else is tracked" property as above.
export async function removeServiceFromIntegrationTarget(id: string, slug: string): Promise<void> {
  const excluded = await currentExcludedSlugs(id);
  if (excluded.includes(slug)) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("integrations")
    .update({ excluded_service_slugs: [...excluded, slug] })
    .eq("id", id);
  if (error) throw error;
}

// --- Recipient verification -------------------------------------------
//
// Adding a recipient never makes it live immediately — it starts
// unverified, with a code/token the connect flow's second step (SMS) or
// an emailed link (email) has to confirm before the notifier will ever
// send to it. See supabase/migrations/0019_integration_recipients.sql.

export function generateVerification(channel: "email" | "sms"): { code: string; expiresAt: string } {
  const code =
    channel === "sms"
      ? String(Math.floor(100_000 + Math.random() * 900_000)) // 6-digit OTP, texted directly
      : crypto.randomUUID(); // opaque token, embedded in the confirmation link
  const ttlMs = channel === "sms" ? SMS_CODE_TTL_MS : EMAIL_TOKEN_TTL_MS;
  return { code, expiresAt: nowPlusIso(ttlMs) };
}

// Upserts on (integration_id, value): re-adding an existing recipient
// (e.g. after removing it) starts its verification over rather than
// erroring on a duplicate.
export async function addRecipient(integrationId: string, channel: "email" | "sms", value: string, code: string, expiresAt: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("integration_recipients").upsert(
    { integration_id: integrationId, channel, value, verified: false, verification_code: code, verification_expires_at: expiresAt },
    { onConflict: "integration_id,value" },
  );
  if (error) throw error;
}

export async function removeRecipient(integrationId: string, value: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("integration_recipients").delete().eq("integration_id", integrationId).eq("value", value).select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

// Public confirmation-link flow — clicked from an email client, so the
// browser completing it may have no session for the account that added
// the recipient at all. The token itself is the authorization, same as
// this app's existing Supabase email-confirmation links, so this runs
// through the service-role client rather than the session-scoped one.
export async function verifyEmailRecipient(token: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("integration_recipients")
    .update({ verified: true, verification_code: null, verification_expires_at: null })
    .eq("channel", "email")
    .eq("verification_code", token)
    .gt("verification_expires_at", nowIso())
    .select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

// Submitted from inside the (authenticated) connect form's second step —
// stays on the session-scoped client, RLS-restricted to the caller's own
// integration the same as everything else in this file.
export async function verifySmsRecipient(integrationId: string, value: string, code: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("integration_recipients")
    .update({ verified: true, verification_code: null, verification_expires_at: null })
    .eq("integration_id", integrationId)
    .eq("value", value)
    .eq("verification_code", code)
    .gt("verification_expires_at", nowIso())
    .select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
