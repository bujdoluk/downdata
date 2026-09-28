export type ReportInterval = "daily" | "weekly" | "monthly";

export type ReportSettings = {
  interval: ReportInterval;
  // Exclusion list so boards created later are included automatically.
  excludedBoardIds: string[];
  emailNudgeEnabled: boolean;
};

export type ServiceReportEntry = {
  slug: string;
  name: string;
  uptimePercent: number;
  incidentCount: number;
  // Optional: older reports can't reconstruct it, so render "not recorded"
  // instead of a fabricated 0.
  maintenanceCount: number | undefined;
  downtimeMinutes: number;
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
  // Not a full add/remove diff: board membership has no history.
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
