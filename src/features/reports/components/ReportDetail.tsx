"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDate, formatDateTime, formatDuration } from "@/lib/formatTime";
import { useTimeZone } from "@/hooks/useTimeZone";
import type { StoredReport } from "@/features/reports/types";

// The full per-board/per-service breakdown for one generated report — the
// data the nudge email deliberately doesn't carry inline (see
// ReportReady.tsx's own comment on why it's link-only).
export default function ReportDetail({ report }: { report: StoredReport }) {
  const { t } = useTranslation();
  const timeZone = useTimeZone();
  const { payload } = report;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base-content text-lg font-semibold">
          {formatDate(report.periodStart)} – {formatDate(report.periodEnd)}
        </h2>
        {/* periodStart/periodEnd are plain calendar dates (formatDate's own
            contract) — generatedAt is a full timestamptz instant, so it
            needs formatDateTime's timezone-aware conversion instead. */}
        <p className="text-base-content/50 text-xs">{t("reports.generatedOn", { date: formatDateTime(report.generatedAt, timeZone) })}</p>
      </div>

      <div className="stats stats-vertical sm:stats-horizontal bg-base-100 shadow">
        <div className="stat">
          <div className="stat-title">{t("reports.overallUptime")}</div>
          <div className="stat-value text-2xl">{payload.overallUptimePercent}%</div>
        </div>
        <div className="stat">
          <div className="stat-title">{t("reports.incidents")}</div>
          <div className="stat-value text-2xl">{payload.newIncidentCount}</div>
          <div className="stat-desc">{t("reports.resolvedIncidents", { count: payload.resolvedIncidentCount })}</div>
        </div>
        <div className="stat">
          <div className="stat-title">{t("reports.downtime")}</div>
          <div className="stat-value text-2xl">{formatDuration(payload.totalDowntimeMinutes, t)}</div>
          {payload.longestOutageMinutes > 0 && (
            <div className="stat-desc">{t("reports.longestOutage", { duration: formatDuration(payload.longestOutageMinutes, t) })}</div>
          )}
        </div>
      </div>

      {payload.atRiskServiceSlugs.length > 0 && (
        <div className="alert alert-error alert-soft">
          <span className="text-sm font-medium">{t("reports.atRisk", { count: payload.atRiskServiceSlugs.length })}</span>
        </div>
      )}

      {(payload.upcomingMaintenanceCount > 0 || payload.completedMaintenanceCount > 0 || payload.keywordMatchCount > 0) && (
        <div className="text-base-content/60 flex flex-wrap gap-4 text-sm">
          {payload.completedMaintenanceCount > 0 && <span>{t("reports.completedMaintenance", { count: payload.completedMaintenanceCount })}</span>}
          {payload.upcomingMaintenanceCount > 0 && <span>{t("reports.upcomingMaintenance", { count: payload.upcomingMaintenanceCount })}</span>}
          {payload.keywordMatchCount > 0 && <span>{t("reports.keywordMatches", { count: payload.keywordMatchCount })}</span>}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {payload.boards.map((board) => (
          <div key={board.boardId}>
            <h3 className="text-base-content/70 mb-2 text-sm font-semibold">{board.boardName}</h3>
            {board.services.length === 0 ? (
              <p className="text-base-content/40 text-xs">{t("reports.noServicesOnBoard")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-sm table">
                  <thead>
                    <tr>
                      <th>{t("reports.table.service")}</th>
                      <th>{t("reports.table.uptime")}</th>
                      <th>{t("reports.table.incidents")}</th>
                      <th>{t("reports.table.downtime")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.services.map((service) => (
                      <tr key={service.slug} className={service.atRisk ? "text-error" : undefined}>
                        <td>
                          {service.name}
                          {payload.newlyTrackedServiceSlugs.includes(service.slug) && (
                            <span className="badge badge-xs badge-info ml-2">{t("reports.newlyTracked")}</span>
                          )}
                        </td>
                        <td>{service.uptimePercent}%</td>
                        <td>{service.incidentCount}</td>
                        <td>{formatDuration(service.downtimeMinutes, t)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
