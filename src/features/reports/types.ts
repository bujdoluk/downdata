export type ReportInterval = "daily" | "weekly" | "monthly";

export type ReportSettings = {
  interval: ReportInterval;
  // Which of this account's own boards should NOT feed into the report —
  // an exclusion list, not an inclusion one, same reasoning as
  // Integration.excludedServiceSlugs: a board created later is included
  // automatically, with nothing to remember to opt it in.
  excludedBoardIds: string[];
  emailNudgeEnabled: boolean;
};

export type ServiceReportEntry = {
  slug: string;
  name: string;
  uptimePercent: number;
  incidentCount: number;
  // Completed-in-period + still-upcoming/in-progress maintenances for this
  // service, summed — the per-service breakdown of the report-level
  // upcomingMaintenanceCount/completedMaintenanceCount below. Genuinely
  // optional, not just possibly-missing: a report generated before this
  // field existed has no way to know its real value (the upcoming/
  // in-progress half is a point-in-time snapshot with no history to
  // reconstruct it from), so render sites show an explicit "not
  // recorded" marker rather than defaulting to 0 — a fabricated zero
  // would be indistinguishable from a service that genuinely had none.
  maintenanceCount: number | undefined;
  downtimeMinutes: number;
  // Below the at-risk uptime threshold for this period, or currently has
  // an open major/critical incident — see reportGeneration.ts's
  // AT_RISK_UPTIME_THRESHOLD.
  atRisk: boolean;
};

export type BoardReportSection = {
  boardId: string;
  boardName: string;
  services: ServiceReportEntry[];
};

export type ReportPayload = {
  overallUptimePercent: number;
  newIncidentCount: number;
  resolvedIncidentCount: number;
  totalDowntimeMinutes: number;
  longestOutageMinutes: number;
  atRiskServiceSlugs: string[];
  // Services whose tracking (uptime.ts's trackedSince) started inside this
  // period — not a full add/remove diff, since board membership has no
  // history log to diff against (see the file header comment on
  // reportGeneration.ts).
  newlyTrackedServiceSlugs: string[];
  upcomingMaintenanceCount: number;
  completedMaintenanceCount: number;
  keywordMatchCount: number;
  boards: BoardReportSection[];
};

export type StoredReport = {
  id: string;
  interval: ReportInterval;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  payload: ReportPayload;
};
