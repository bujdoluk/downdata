import { getSupabaseClient } from "@/lib/supabase";
import type { IntegrationDefinition } from "@/types/integration";

type IntegrationRow = { slug: string; name: string; webhook_url: string };

function toIntegration(row: IntegrationRow): IntegrationDefinition {
  return { slug: row.slug, name: row.name, webhookUrl: row.webhook_url };
}

export async function getAllIntegrations(): Promise<IntegrationDefinition[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("integrations").select("slug, name, webhook_url");
  if (error) throw error;
  return (data as IntegrationRow[] | null)?.map(toIntegration) ?? [];
}

export async function addIntegration(input: { slug: string; name: string; webhookUrl: string }): Promise<IntegrationDefinition> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("integrations")
    .upsert({ slug: input.slug, name: input.name, webhook_url: input.webhookUrl });
  if (error) throw error;
  return input;
}

export async function removeIntegration(slug: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("integrations").delete().eq("slug", slug).select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
