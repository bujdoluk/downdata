import { createClient } from "@/lib/supabase/server";
import { resolveTimeZone } from "@/lib/account";
import type { ReportInterval, ReportSettings } from "@/features/reports/types";

type SettingsRow = { report_interval: ReportInterval; excluded_board_ids: string[] | null; email_nudge_enabled: boolean };

// No row yet = every default still applies — same "absence = default"
// convention subscriptions/integrations already use, not a row this app
// pre-seeds for every account.
const DEFAULT_SETTINGS: ReportSettings = { interval: "weekly", excludedBoardIds: [], emailNudgeEnabled: true };

function toSettings(row: SettingsRow): ReportSettings {
  return { interval: row.report_interval, excludedBoardIds: row.excluded_board_ids ?? [], emailNudgeEnabled: row.email_nudge_enabled };
}

export async function getReportSettings(): Promise<ReportSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("report_settings").select("report_interval, excluded_board_ids, email_nudge_enabled").maybeSingle();
  if (error) throw error;
  return data ? toSettings(data as SettingsRow) : DEFAULT_SETTINGS;
}

// Keeps report_settings.time_zone in sync with the account's real profile
// timezone (auth.users.user_metadata — lib/account.ts) whenever a real
// session is available (called from GET /api/reports/settings, hit every
// time the /reports page loads). The report-generation cron runs with no
// session at all and no other way to read a per-account IANA timezone
// without the Admin API, so this column is the one place it's cached for
// that cross-account read — see 0032_reports.sql's comment. Only ever
// touches this one column (PostgREST's upsert only includes columns
// present in the payload on conflict), so it never clobbers an explicit
// settings save.
export async function syncOwnTimeZone(): Promise<void> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const timeZone = resolveTimeZone(userData.user.user_metadata.time_zone);
  const { error } = await supabase.from("report_settings").upsert({ user_id: userData.user.id, time_zone: timeZone }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function updateReportSettings(
  input: Partial<{ interval: ReportInterval; excludedBoardIds: string[]; emailNudgeEnabled: boolean }>,
): Promise<ReportSettings> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in.");

  const patch: { user_id: string; report_interval?: ReportInterval; excluded_board_ids?: string[]; email_nudge_enabled?: boolean } = {
    user_id: userData.user.id,
  };
  if (input.interval !== undefined) patch.report_interval = input.interval;
  if (input.excludedBoardIds !== undefined) patch.excluded_board_ids = input.excludedBoardIds;
  if (input.emailNudgeEnabled !== undefined) patch.email_nudge_enabled = input.emailNudgeEnabled;

  const { data, error } = await supabase
    .from("report_settings")
    .upsert(patch, { onConflict: "user_id" })
    .select("report_interval, excluded_board_ids, email_nudge_enabled")
    .single();
  if (error) throw error;
  return toSettings(data as SettingsRow);
}
