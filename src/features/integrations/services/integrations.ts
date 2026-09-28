import { createClient } from "@/lib/supabase/server";
import { getSupabaseClient } from "@/lib/supabase";
import { nowIso, nowPlusIso } from "@/lib/formatTime";
import type { IntegrationDefinition, Recipient, WebhookTarget } from "@/types/integration";

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

type IntegrationRecipientRow = { integration_id: string; channel: string; value: string; verified: boolean; webhook_secret: string | null };

function toIntegration(row: IntegrationRow, recipients: Recipient[], webhookTargets: WebhookTarget[]): IntegrationDefinition | null {
  if (row.slug === "slack" && row.webhook_url) {
    return { id: row.id, slug: "slack", name: row.name, webhookUrl: row.webhook_url, excludedServiceSlugs: row.excluded_service_slugs };
  }
  if (row.slug === "email") {
    return {
      id: row.id,
      slug: "email",
      name: row.name,
      recipients,
      notifyImpacts: row.notify_impacts ?? ["major", "critical"],
      excludedServiceSlugs: row.excluded_service_slugs,
    };
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
  if (row.slug === "webhook") {
    return {
      id: row.id,
      slug: "webhook",
      name: row.name,
      targets: webhookTargets,
      notifyImpacts: row.notify_impacts ?? ["major", "critical"],
      excludedServiceSlugs: row.excluded_service_slugs,
    };
  }
  return null;
}

// One query for recipients and webhook targets alike, to avoid per-cycle query
// multiplication (see AGENTS.md Failure log). Webhook rows are always verified.
async function integrationTargetsByIntegration(
  supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof getSupabaseClient>,
  integrationIds: string[],
  onlyVerified: boolean,
): Promise<{ recipients: Map<string, Recipient[]>; webhookTargets: Map<string, WebhookTarget[]> }> {
  const recipients = new Map<string, Recipient[]>();
  const webhookTargets = new Map<string, WebhookTarget[]>();
  if (integrationIds.length === 0) return { recipients, webhookTargets };

  let query = supabase.from("integration_recipients").select("integration_id, channel, value, verified, webhook_secret").in("integration_id", integrationIds);
  if (onlyVerified) query = query.eq("verified", true);
  const { data, error } = await query;
  if (error) throw error;

  for (const row of (data as IntegrationRecipientRow[] | null) ?? []) {
    if (row.channel === "webhook") {
      if (!row.webhook_secret) {
        // Logged, not thrown: one bad row shouldn't break every other integration's read.
        console.error(`integrationTargetsByIntegration: webhook target "${row.value}" (integration ${row.integration_id}) has no webhook_secret — skipping it.`);
        continue;
      }
      const list = webhookTargets.get(row.integration_id) ?? [];
      list.push({ value: row.value, secret: row.webhook_secret });
      webhookTargets.set(row.integration_id, list);
    } else {
      const list = recipients.get(row.integration_id) ?? [];
      list.push({ value: row.value, verified: row.verified });
      recipients.set(row.integration_id, list);
    }
  }
  return { recipients, webhookTargets };
}

export async function getAllIntegrations(): Promise<IntegrationDefinition[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("integrations").select("id, slug, name, webhook_url, notify_impacts, excluded_service_slugs");
  if (error) throw error;
  const rows = (data as IntegrationRow[] | null) ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const { recipients, webhookTargets } = await integrationTargetsByIntegration(supabase, ids, false);
  return rows.flatMap((row) => {
    const integration = toIntegration(row, recipients.get(row.id) ?? [], webhookTargets.get(row.id) ?? []);
    return integration ? [integration] : [];
  });
}

// Service-role, cross-account, verified recipients only. Cron notifier only:
// it bypasses RLS, so never call it from a user-facing path.
export async function getAllIntegrationsAcrossUsers(): Promise<{ integration: IntegrationDefinition; userId: string }[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("id, user_id, slug, name, webhook_url, notify_impacts, excluded_service_slugs");
  if (error) throw error;
  const rows = (data as (IntegrationRow & { user_id: string })[] | null) ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const { recipients, webhookTargets } = await integrationTargetsByIntegration(supabase, ids, true);
  return rows.flatMap((row) => {
    const integration = toIntegration(row, recipients.get(row.id) ?? [], webhookTargets.get(row.id) ?? []);
    return integration ? [{ integration, userId: row.user_id }] : [];
  });
}

export async function resolveIntegrationBySlug(slug: string): Promise<{ id: string; slug: string } | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("integrations").select("id, slug").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ?? undefined;
}

export async function addIntegration(
  input:
    | { slug: "slack"; name: string; webhookUrl: string }
    | { slug: "email"; name: string; notifyImpacts?: string[] }
    | { slug: "sms"; name: string; notifyImpacts?: string[] }
    | { slug: "webhook"; name: string; notifyImpacts?: string[] },
): Promise<{ id: string; slug: string }> {
  const supabase = await createClient();
  // One concrete row type: upsert() rejects a union-typed row. notify_impacts is
  // omitted unless passed, so a later upsert doesn't reset a customized filter.
  const row: { slug: string; name: string; webhook_url?: string; notify_impacts?: string[] } =
    input.slug === "slack"
      ? { slug: input.slug, name: input.name, webhook_url: input.webhookUrl }
      : { slug: input.slug, name: input.name, ...(input.notifyImpacts ? { notify_impacts: input.notifyImpacts } : {}) };
  const { data, error } = await supabase.from("integrations").upsert(row, { onConflict: "user_id,slug" }).select("id, slug").single();
  if (error) throw error;
  return data as { id: string; slug: string };
}

export async function integrationExists(slug: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("integrations").select("id").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function updateNotifyImpacts(id: string, notifyImpacts: string[]): Promise<void> {
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

// An exclusion list, so toggling one slug never disturbs other services, present or future.
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

// Recipients start unverified; the notifier only sends to verified ones (0019).
export function generateVerification(channel: "email" | "sms"): { code: string; expiresAt: string } {
  const code =
    channel === "sms"
      ? String(Math.floor(100_000 + Math.random() * 900_000))
      : crypto.randomUUID();
  const ttlMs = channel === "sms" ? SMS_CODE_TTL_MS : EMAIL_TOKEN_TTL_MS;
  return { code, expiresAt: nowPlusIso(ttlMs) };
}

// Upsert so re-adding a recipient restarts verification instead of erroring.
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

// Service-role: clicked from an email client with possibly no session, so the
// token itself is the authorization.
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

// Inserted already verified: the route pinged the URL first. Re-adding rotates the secret.
export async function addWebhookTarget(integrationId: string, url: string, secret: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("integration_recipients")
    .upsert({ integration_id: integrationId, channel: "webhook", value: url, verified: true, webhook_secret: secret }, { onConflict: "integration_id,value" });
  if (error) throw error;
}
