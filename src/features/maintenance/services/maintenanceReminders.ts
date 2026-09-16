import { createClient } from "@/lib/supabase/server";
import { getSupabaseClient } from "@/lib/supabase";
import type { MaintenanceReminderRule, ReminderChannel } from "@/features/maintenance/types";

// Re-exported for existing callers — the resolution logic itself lives in
// resolveReminderRule.ts (pure, no Supabase imports) so client components
// can import it directly without pulling this server-only file's Supabase
// clients into the client bundle. See that file's own comment.
export { resolveRuleForService } from "@/features/maintenance/services/resolveReminderRule";

// The DB's own "applies to every tracked service" sentinel — see
// 0038_maintenance_reminders.sql's column comment for why this is a
// non-null sentinel rather than service_slug being nullable. Stays
// entirely inside this file; every other caller only ever sees
// MaintenanceReminderRule.serviceSlug as string | null.
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

// RLS-scoped to the caller's own rules (0038_maintenance_reminders.sql).
export async function getMyReminderRules(): Promise<MaintenanceReminderRule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("maintenance_reminder_rules").select("id, service_slug, minutes_before, channels");
  if (error) throw error;
  return ((data as ReminderRuleRow[] | null) ?? []).map(toReminderRule);
}

// Create-or-update by (user_id, service_slug) — the table's own unique
// constraint is what actually enforces "at most one rule per
// scope-target" (see the migration); this just upserts against it, same
// onConflict target regardless of whether serviceSlug is a real slug or
// the "all" sentinel, since both share the one ordinary unique index.
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

// Every account's reminder rules, tagged with their owner — service-role
// client, for exactly one caller: the cron reminder scan
// (lib/pollMaintenanceReminders.ts), which runs with no user session, same
// reasoning as boards.ts's getAllTrackedSlugsAcrossUsers()/integrations.ts's
// getAllIntegrationsAcrossUsers(). Never call this from a user-facing code
// path — it bypasses RLS entirely and would leak every account's rules.
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
