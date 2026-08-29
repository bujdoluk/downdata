import { getSupabaseClient } from "@/lib/supabase";
import type { IntegrationDefinition } from "@/types/integration";

type IntegrationRow = { slug: string; name: string; webhook_url: string | null; recipient_emails: string[] | null };

function toIntegration(row: IntegrationRow): IntegrationDefinition | null {
  if (row.slug === "slack" && row.webhook_url) {
    return { slug: "slack", name: row.name, webhookUrl: row.webhook_url };
  }
  if (row.slug === "email" && row.recipient_emails) {
    return { slug: "email", name: row.name, recipientEmails: row.recipient_emails };
  }
  return null;
}

export async function getAllIntegrations(): Promise<IntegrationDefinition[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("integrations").select("slug, name, webhook_url, recipient_emails");
  if (error) throw error;
  return (data as IntegrationRow[] | null)?.flatMap((row) => toIntegration(row) ?? []) ?? [];
}

export async function addIntegration(
  input: { slug: "slack"; name: string; webhookUrl: string } | { slug: "email"; name: string; recipientEmails: string[] },
): Promise<IntegrationDefinition> {
  const supabase = getSupabaseClient();
  // Built as one concrete row type (not left as the union `input` itself
  // is) — upsert()'s overloads reject a row typed as a union of two
  // shapes even when each member is individually valid.
  const row: { slug: string; name: string; webhook_url?: string; recipient_emails?: string[] } =
    input.slug === "slack"
      ? { slug: input.slug, name: input.name, webhook_url: input.webhookUrl }
      : { slug: input.slug, name: input.name, recipient_emails: input.recipientEmails };
  const { error } = await supabase.from("integrations").upsert(row);
  if (error) throw error;
  return input;
}

export async function removeIntegration(slug: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("integrations").delete().eq("slug", slug).select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
