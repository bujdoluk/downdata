import { createClient } from "@/lib/supabase/server";
import { getSupabaseClient } from "@/lib/supabase";
import type { MaintenanceReminderRule, ReminderChannel } from "@/features/maintenance/types";

// Logic lives in resolveReminderRule.ts (no Supabase) so client components can import it.
export { resolveRuleForService } from "@/features/maintenance/services/resolveReminderRule";

// Non-null wildcard sentinel: PostgREST upsert can't target partial unique
// indexes, so a nullable service_slug won't work. Never leaves this file.
const ALL_SCOPE_SENTINEL = "__all__";

type ReminderRuleRow = {
  id: string;
  service_slug: string;
  minutes_before: number;
  channels: string[];
};

function toReminderRule(row: ReminderRuleRow): MaintenanceReminderRule {
  return {
    id: row.id,
    serviceSlug: row.service_slug === ALL_SCOPE_SENTINEL ? null : row.service_slug,
    minutesBefore: row.minutes_before,
    channels: row.channels as ReminderChannel[],
  };
}

export async function getMyReminderRules(): Promise<MaintenanceReminderRule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("maintenance_reminder_rules").select("id, service_slug, minutes_before, channels");
  if (error) throw error;
  return ((data as ReminderRuleRow[] | null) ?? []).map(toReminderRule);
}

export async function upsertReminderRule(input: { serviceSlug: string | null; minutesBefore: number; channels: ReminderChannel[] }): Promise<MaintenanceReminderRule> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_reminder_rules")
    .upsert(
      { service_slug: input.serviceSlug ?? ALL_SCOPE_SENTINEL, minutes_before: input.minutesBefore, channels: input.channels },
      { onConflict: "user_id,service_slug" },
    )
    .select("id, service_slug, minutes_before, channels")
    .single();
  if (error) throw error;
  return toReminderRule(data as ReminderRuleRow);
}

export async function removeReminderRule(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("maintenance_reminder_rules").delete().eq("id", id).select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

// Service-role, cron-only (no session). Bypasses RLS: never call from a user-facing path.
export async function getAllReminderRulesAcrossUsers(): Promise<Map<string, MaintenanceReminderRule[]>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("maintenance_reminder_rules").select("id, user_id, service_slug, minutes_before, channels");
  if (error) throw error;
  const byUser = new Map<string, MaintenanceReminderRule[]>();
  for (const row of (data as (ReminderRuleRow & { user_id: string })[] | null) ?? []) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(toReminderRule(row));
    byUser.set(row.user_id, list);
  }
  return byUser;
}
