// The report-generation cron's actual work (app/api/cron/generate-reports
// calls generateDueReports() below). Boards have no history log to diff
// against — service_slugs is just current state — so "board activity" in
// a report is limited to newlyTrackedServiceSlugs (derived from each
// service's own trackedSince, uptime.ts's existing concept), not a real
// added/removed diff. Flagged here rather than silently shipped as if it
// were the full thing.
import type { SupabaseClient } from "@supabase/supabase-js";
import { render } from "@react-email/render";
import { Temporal } from "temporal-polyfill";
import { getSupabaseClient } from "@/lib/supabase";
import { getAllBoardsAcrossUsers } from "@/features/boards/services/boards";
import { getAllIntegrationsAcrossUsers } from "@/features/integrations/services/integrations";
import { getResendClient } from "@/features/integrations/services/resend";
import { getCatalog } from "@/lib/catalog";
import { getStoredIncidentSummariesForService, toIncidentSummaryApiShape } from "@/lib/getStoredIncident";
import { getAllStoredMaintenanceSummaries } from "@/features/maintenance/services/getStoredMaintenance";
import { getAllTimeUptimeStats, computeOfficial30DaysUptime } from "@/lib/uptime";
import { emailLogoUrl } from "@/lib/emailLogoUrl";
import { epochMs, isoFromEpochMs } from "@/lib/formatTime";
import { runInBatches } from "@/lib/runInBatches";
import ReportReady from "@/components/emails/ReportReady";
import type { Board } from "@/types/board";
import type { Catalog } from "@/types/service";
import type { BoardReportSection, ReportInterval, ReportPayload, ServiceReportEntry } from "@/features/reports/types";

// Same "two nines" baseline used across the industry (Pingdom's own SLA
// copy, e.g.) — low enough that an ordinary blip doesn't flag every week,
// high enough that a genuinely bad one doesn't slip through quiet. Fixed
// for every account, no settings UI — see the grilling session that
// settled this feature's scope for why.
const AT_RISK_UPTIME_THRESHOLD = 99;

// Local hour (in the account's own timezone) a report sends at once its
// period has just completed. Requires app/api/cron/generate-reports to
// actually be invoked roughly hourly by the external scheduler — a daily
// invocation would only ever catch the accounts whose local send hour
// happens to line up with whenever that one daily tick lands.
const REPORT_SEND_HOUR = 8;

const ACCOUNT_CONCURRENCY = 10;
const SERVICE_CONCURRENCY = 20;

function isBoundaryDay(interval: ReportInterval, today: Temporal.PlainDate): boolean {
  if (interval === "daily") return true;
  if (interval === "weekly") return today.dayOfWeek === 1; // Monday
  return today.day === 1;
}

// The period that just completed as of `today` — ending yesterday, so a
// report never covers a day still in progress. Calendar-aligned throughout
// (Mon-Sun weeks, 1st-to-1st months) — no per-account custom start day,
// per this feature's settled scope.
function completedPeriodEnding(interval: ReportInterval, today: Temporal.PlainDate): { start: Temporal.PlainDate; end: Temporal.PlainDate } {
  const end = today.subtract({ days: 1 });
  if (interval === "daily") return { start: end, end };
  if (interval === "weekly") return { start: end.subtract({ days: 6 }), end };
  return { start: end.with({ day: 1 }), end };
}

// Merges overlapping major/critical intervals within the window — same
// idea as uptime.ts's computeOfficial30DaysUptime, kept as its own small
// helper here (not added to that shared file) since only this feature
// needs downtime-in-minutes and the single longest outage, not a percent.
function computePeriodDowntime(
  incidents: { impact: string; created_at: string; resolved_at: string | null }[],
  windowStartMs: number,
  windowEndMs: number,
): { downtimeMinutes: number; longestOutageMinutes: number } {
  const OUTAGE_IMPACTS = new Set(["major", "critical"]);
  const intervals = incidents
    .filter((incident) => OUTAGE_IMPACTS.has(incident.impact))
    .map((incident) => ({
      start: Math.max(epochMs(incident.created_at), windowStartMs),
      end: Math.min(incident.resolved_at ? epochMs(incident.resolved_at) : windowEndMs, windowEndMs),
    }))
    .filter((interval) => interval.end > interval.start)
    .sort((a, b) => a.start - b.start);

  let downtimeMs = 0;
  let longestMs = 0;
  let mergedEnd = -Infinity;
  for (const interval of intervals) {
    const start = Math.max(interval.start, mergedEnd);
    if (interval.end > start) downtimeMs += interval.end - start;
    longestMs = Math.max(longestMs, interval.end - interval.start);
    mergedEnd = Math.max(mergedEnd, interval.end);
  }
  return { downtimeMinutes: Math.round(downtimeMs / 60_000), longestOutageMinutes: Math.round(longestMs / 60_000) };
}

// The account's own watched keywords with any match captured in the
// window, across whichever sources it currently has enabled — a
// service-role, period-bounded, single-account variant of
// earlyWarnings.ts's getMatchesForOwnKeywords (which is session-scoped and
// unbounded by time), since the report-generation cron has no session.
// Defaults to 0 on any failure — this is a secondary metric, not worth
// failing a whole account's report over.
async function countKeywordMatchesForUser(supabase: SupabaseClient, userId: string, windowStartIso: string, windowEndIso: string): Promise<number> {
  try {
    const { data: watchRows } = await supabase.from("keyword_watches").select("keyword").eq("user_id", userId);
    const keywords = [...new Set(((watchRows as { keyword: string }[] | null) ?? []).map((row) => row.keyword))];
    if (keywords.length === 0) return 0;

    const { data: settingRows } = await supabase.from("keyword_source_settings").select("source").eq("user_id", userId).eq("enabled", true);
    const sources = ((settingRows as { source: string }[] | null) ?? []).map((row) => row.source);
    if (sources.length === 0) return 0;

    const { data: linkRows } = await supabase
      .from("keyword_match_keywords")
      .select("source, external_id")
      .in("keyword", keywords)
      .in("source", sources);
    const links = (linkRows as { source: string; external_id: string }[] | null) ?? [];
    if (links.length === 0) return 0;

    let count = 0;
    for (const source of new Set(links.map((link) => link.source))) {
      const externalIds = [...new Set(links.filter((link) => link.source === source).map((link) => link.external_id))];
      const { data: matchRows } = await supabase
        .from("keyword_matches")
        .select("external_id")
        .eq("source", source)
        .in("external_id", externalIds)
        .gte("captured_at", windowStartIso)
        .lte("captured_at", windowEndIso);
      count += matchRows?.length ?? 0;
    }
    return count;
  } catch (error) {
    console.error(`countKeywordMatchesForUser: failed for account ${userId}:`, error);
    return 0;
  }
}

// The full computed report for one account's included boards over one
// period. allSlugs is deduped across boards first so a service tracked on
// two of the account's own boards is never double-counted in the
// account-level totals — each board section below just reads its own
// slugs back out of the same per-slug map.
async function computeReportPayload(
  userId: string,
  boards: Board[],
  periodStart: Temporal.PlainDate,
  periodEnd: Temporal.PlainDate,
  catalogBySlug: Map<string, Catalog>,
): Promise<ReportPayload> {
  const windowStartIso = `${periodStart.toString()}T00:00:00.000Z`;
  const windowEndIso = `${periodEnd.toString()}T23:59:59.999Z`;
  const windowStartMs = epochMs(windowStartIso);
  const windowEndMs = epochMs(windowEndIso);

  const allSlugs = [...new Set(boards.flatMap((board) => board.Slugs))];
  if (allSlugs.length === 0) {
    return {
      overallUptimePercent: 100,
      newIncidentCount: 0,
      resolvedIncidentCount: 0,
      totalDowntimeMinutes: 0,
      longestOutageMinutes: 0,
      atRiskServiceSlugs: [],
      newlyTrackedServiceSlugs: [],
      upcomingMaintenanceCount: 0,
      completedMaintenanceCount: 0,
      keywordMatchCount: 0,
      boards: boards.map((board) => ({ boardId: board.id, boardName: board.name, services: [] })),
    };
  }

  const entryBySlug = new Map<string, ServiceReportEntry>();
  const newIncidentCountBySlug = new Map<string, number>();
  const resolvedIncidentCountBySlug = new Map<string, number>();
  const newlyTrackedServiceSlugs: string[] = [];
  let longestOutageMinutesOverall = 0;

  await runInBatches(allSlugs, SERVICE_CONCURRENCY, async (slug) => {
    // getStoredIncidentSummariesForService's "since" filter has no upper
    // bound of its own — acceptable here because a report is always
    // generated right as its period ends (see generateDueReports), so
    // nothing has happened after windowEndIso yet at generation time.
    const [incidents, uptimeStats] = await Promise.all([getStoredIncidentSummariesForService(slug, windowStartIso), getAllTimeUptimeStats(slug)]);

    // Clipped to trackedSince when tracking started mid-period — same
    // reasoning as uptime.ts's getServiceUptimeSummary: without this, a
    // service added on day 3 of a 7-day week would score against 4 days
    // it was never actually observed for, reading as a perfect uptime
    // rather than an unmeasured one.
    const trackedSinceMs = uptimeStats?.trackedSince ? epochMs(uptimeStats.trackedSince) : null;
    const effectiveWindowStartMs = trackedSinceMs !== null ? Math.max(windowStartMs, trackedSinceMs) : windowStartMs;
    const effectiveWindowStartIso = isoFromEpochMs(effectiveWindowStartMs);

    const uptimePercent = computeOfficial30DaysUptime(incidents.map(toIncidentSummaryApiShape), effectiveWindowStartIso, windowEndIso);
    const { downtimeMinutes, longestOutageMinutes } = computePeriodDowntime(incidents, effectiveWindowStartMs, windowEndMs);
    longestOutageMinutesOverall = Math.max(longestOutageMinutesOverall, longestOutageMinutes);

    const hasOpenOutage = incidents.some((incident) => incident.resolved_at === null && (incident.impact === "major" || incident.impact === "critical"));
    newIncidentCountBySlug.set(slug, incidents.filter((incident) => epochMs(incident.created_at) >= windowStartMs).length);
    resolvedIncidentCountBySlug.set(
      slug,
      incidents.filter((incident) => incident.resolved_at && epochMs(incident.resolved_at) >= windowStartMs && epochMs(incident.resolved_at) <= windowEndMs).length,
    );

    entryBySlug.set(slug, {
      slug,
      name: catalogBySlug.get(slug)?.name ?? slug,
      uptimePercent,
      incidentCount: incidents.length,
      downtimeMinutes,
      atRisk: uptimePercent < AT_RISK_UPTIME_THRESHOLD || hasOpenOutage,
    });

    if (uptimeStats?.trackedSince) {
      const trackedSinceMs = epochMs(uptimeStats.trackedSince);
      if (trackedSinceMs >= windowStartMs && trackedSinceMs <= windowEndMs) newlyTrackedServiceSlugs.push(slug);
    }
  });

  const boardSections: BoardReportSection[] = boards.map((board) => ({
    boardId: board.id,
    boardName: board.name,
    services: board.Slugs.map((slug) => entryBySlug.get(slug)).filter((entry): entry is ServiceReportEntry => entry !== undefined),
  }));

  const allEntries = [...entryBySlug.values()];
  const overallUptimePercent = allEntries.length > 0 ? Math.round((allEntries.reduce((sum, entry) => sum + entry.uptimePercent, 0) / allEntries.length) * 100) / 100 : 100;

  const supabase = getSupabaseClient();
  const [upcomingMaintenances, completedMaintenanceRows, keywordMatchCount] = await Promise.all([
    getAllStoredMaintenanceSummaries(allSlugs),
    supabase
      .from("maintenances")
      .select("id")
      .in("service_slug", allSlugs)
      .eq("status", "completed")
      .gte("resolved_at", windowStartIso)
      .lte("resolved_at", windowEndIso)
      .then(({ data }) => (data as { id: string }[] | null) ?? []),
    countKeywordMatchesForUser(supabase, userId, windowStartIso, windowEndIso),
  ]);

  return {
    overallUptimePercent,
    newIncidentCount: [...newIncidentCountBySlug.values()].reduce((sum, count) => sum + count, 0),
    resolvedIncidentCount: [...resolvedIncidentCountBySlug.values()].reduce((sum, count) => sum + count, 0),
    totalDowntimeMinutes: allEntries.reduce((sum, entry) => sum + entry.downtimeMinutes, 0),
    longestOutageMinutes: longestOutageMinutesOverall,
    atRiskServiceSlugs: allEntries.filter((entry) => entry.atRisk).map((entry) => entry.slug),
    newlyTrackedServiceSlugs,
    upcomingMaintenanceCount: upcomingMaintenances.length,
    completedMaintenanceCount: completedMaintenanceRows.length,
    keywordMatchCount,
    boards: boardSections,
  };
}

async function sendReportNudge(recipients: string[], interval: ReportInterval, periodStart: Temporal.PlainDate, periodEnd: Temporal.PlainDate, payload: ReportPayload): Promise<boolean> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) return false;

  const element = ReportReady({
    logoUrl: emailLogoUrl(),
    interval,
    periodStart: periodStart.toString(),
    periodEnd: periodEnd.toString(),
    overallUptimePercent: payload.overallUptimePercent,
    incidentCount: payload.newIncidentCount,
    atRiskCount: payload.atRiskServiceSlugs.length,
  });
  try {
    const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
    const { error } = await getResendClient().emails.send({
      from: `downDATA <${from}>`,
      to: recipients,
      subject: `Your ${interval} report is ready`,
      html,
      text,
    });
    return !error;
  } catch {
    return false;
  }
}

type SettingsRow = { user_id: string; report_interval: ReportInterval; excluded_board_ids: string[] | null; email_nudge_enabled: boolean; time_zone: string };

// Generates and persists every account's due report for this cron tick,
// then sends the opt-out nudge email for each one generated. "Due" means
// either: this is the very first report ever generated for that account's
// currently-selected interval (generated immediately, regardless of
// send hour — see this feature's settled scope), or today is that
// interval's calendar boundary day in the account's own timezone and it's
// currently that account's local REPORT_SEND_HOUR.
export async function generateDueReports(): Promise<{ generated: number; emailsSent: number; failed: number }> {
  const supabase = getSupabaseClient();

  const boardsByUser = await getAllBoardsAcrossUsers();
  if (boardsByUser.size === 0) return { generated: 0, emailsSent: 0, failed: 0 };

  const [catalog, integrationsByUser, settingsRowsResult] = await Promise.all([
    getCatalog(),
    getAllIntegrationsAcrossUsers(),
    supabase.from("report_settings").select("user_id, report_interval, excluded_board_ids, email_nudge_enabled, time_zone"),
  ]);
  const catalogBySlug = new Map(catalog.map((entry) => [entry.slug, entry]));
  const settingsByUser = new Map(((settingsRowsResult.data as SettingsRow[] | null) ?? []).map((row) => [row.user_id, row]));

  // Verified email recipients per account, reused from the one
  // cross-account integrations fetch above — same "one fetch for the whole
  // cycle, group in memory" shape notifyIncidentEvents.ts already relies
  // on, not a second query per account.
  const emailRecipientsByUser = new Map<string, string[]>();
  for (const { integration, userId } of integrationsByUser) {
    if (integration.slug !== "email") continue;
    emailRecipientsByUser.set(userId, [...(emailRecipientsByUser.get(userId) ?? []), ...integration.recipients.map((recipient) => recipient.value)]);
  }

  let generated = 0;
  let emailsSent = 0;
  let failed = 0;

  await runInBatches([...boardsByUser.entries()], ACCOUNT_CONCURRENCY, async ([userId, boards]) => {
    try {
      const settings = settingsByUser.get(userId);
      const interval: ReportInterval = settings?.report_interval ?? "weekly";
      const excludedBoardIds = new Set(settings?.excluded_board_ids ?? []);
      const emailNudgeEnabled = settings?.email_nudge_enabled ?? true;
      const timeZone = settings?.time_zone ?? "UTC";

      const includedBoards = boards.filter((board) => !excludedBoardIds.has(board.id));
      if (includedBoards.length === 0) return;

      const local = Temporal.Now.zonedDateTimeISO(timeZone);
      const today = local.toPlainDate();

      const { count: existingCount } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("report_interval", interval);
      const isFirstReport = (existingCount ?? 0) === 0;

      if (!isFirstReport && !(isBoundaryDay(interval, today) && local.hour === REPORT_SEND_HOUR)) return;
      const period = completedPeriodEnding(interval, today);

      // Guards against a duplicate insert within the same send hour (e.g.
      // an overlapping cron run) — the table's own unique constraint would
      // reject it anyway, but checked first so that reads as a no-op, not
      // a logged failure.
      const { data: existingPeriod } = await supabase
        .from("reports")
        .select("id")
        .eq("user_id", userId)
        .eq("report_interval", interval)
        .eq("period_start", period.start.toString())
        .maybeSingle();
      if (existingPeriod) return;

      const payload = await computeReportPayload(userId, includedBoards, period.start, period.end, catalogBySlug);
      const { error: insertError } = await supabase
        .from("reports")
        .insert({ user_id: userId, report_interval: interval, period_start: period.start.toString(), period_end: period.end.toString(), payload });
      if (insertError) throw insertError;
      generated++;

      if (emailNudgeEnabled) {
        const recipients = emailRecipientsByUser.get(userId) ?? [];
        if (recipients.length > 0 && (await sendReportNudge(recipients, interval, period.start, period.end, payload))) {
          emailsSent++;
        }
      }
    } catch (error) {
      failed++;
      console.error(`generateDueReports: failed for account ${userId}:`, error);
    }
  });

  return { generated, emailsSent, failed };
}
