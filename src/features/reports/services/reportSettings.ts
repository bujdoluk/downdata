import { createClient } from "@/lib/supabase/server";
import { resolveTimeZone } from "@/lib/account";
import type { ReportInterval, ReportSettings } from "@/features/reports/types";

type SettingsRow = { report_interval: ReportInterval; excluded_board_ids: string[] | null; email_nudge_enabled: boolean };

// No row = defaults apply; rows aren't pre-seeded.
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

// Caches the profile timezone for the session-less cron. Upsert only writes
// this column, so it never clobbers a settings save.
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
