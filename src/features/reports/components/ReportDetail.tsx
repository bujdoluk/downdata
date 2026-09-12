"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDate, formatDateTime, formatDuration } from "@/lib/formatTime";
import { useTimeZone } from "@/hooks/useTimeZone";
import Spinner from "@/components/Spinner";
import ModalCloseButton from "@/components/ModalCloseButton";
import PageHeader from "@/components/PageHeader";
import type { StoredReport } from "@/features/reports/types";

// The full per-board/per-service breakdown for one generated report — the
// data the nudge email deliberately doesn't carry inline (see
// ReportReady.tsx's own comment on why it's link-only). Its own dedicated
// page (/reports/[id]) now, not a ListDetailShell second column — see the
// grilling session that settled this move for why (a table + a real
// permalink beat query-param selection once "link to detail" was the ask).
export default function ReportDetail({ report }: { report: StoredReport }) {
  const { t } = useTranslation();
  const router = useRouter();
  const timeZone = useTimeZone();
  const confirmRef = useRef<HTMLDialogElement>(null);
  const { payload } = report;

  const deleteMutation = useMutation({
    mutationFn: () => fetch(`/api/reports/${report.id}`, { method: "DELETE" }),
    onSuccess: (res) => {
      if (!res.ok) return;
      router.push("/reports");
      // initialReports is a Server Component prop (ReportsPageContent),
      // not a TanStack Query cache — nothing to invalidate, but the
      // destination /reports can otherwise serve a router-cached render
      // from before this delete, still showing the deleted report.
      router.refresh();
    },
  });

  return (
    <div className="flex w-full flex-col gap-4 self-start">
      <PageHeader
        back={
          <Link href="/reports" className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium">
            {t("reports.back")}
          </Link>
        }
      >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-base-content text-xl font-semibold">{t(`reports.name.${report.interval}`)}</h1>
            {/* periodStart/periodEnd are plain calendar dates (formatDate's own
                contract) — generatedAt is a full timestamptz instant, so it
                needs formatDateTime's timezone-aware conversion instead. */}
            <p className="text-base-content/50 mt-1 text-xs">
              {formatDate(report.periodStart)} – {formatDate(report.periodEnd)} ·{" "}
              {t("reports.generatedOn", { date: formatDateTime(report.generatedAt, timeZone) })}
            </p>
          </div>
          <button type="button" disabled={deleteMutation.isPending} onClick={() => confirmRef.current?.showModal()} className="btn btn-ghost btn-sm text-error shrink-0">
            {deleteMutation.isPending ? t("reports.deleting") : t("reports.delete")}
          </button>
        </div>

      <dialog ref={confirmRef} className="modal">
        <div className="modal-box relative">
          <ModalCloseButton />
          <h3 className="text-lg font-bold">{t("reports.deleteConfirmTitle")}</h3>
          <p className="text-base-content/70 mt-2 text-sm">
            {t("reports.deleteConfirmMessage", { period: `${formatDate(report.periodStart)} – ${formatDate(report.periodEnd)}` })}
          </p>
          <div className="modal-action">
            <form method="dialog" className="flex gap-2">
              <button type="submit" className="btn btn-sm">
                {t("reports.cancel")}
              </button>
              <button type="button" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()} className="btn btn-error btn-sm">
                {deleteMutation.isPending ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Spinner size="xs" />
                    {t("reports.deleting")}
                  </span>
                ) : (
                  t("reports.delete")
                )}
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>{t("reports.cancel")}</button>
        </form>
      </dialog>

      <div className="stats stats-vertical sm:stats-horizontal bg-base-200 shadow">
        <div className="stat">
          <div className="stat-title">{t("reports.incidents")}</div>
          <div className="stat-value text-2xl">{payload.newIncidentCount}</div>
          <div className="stat-desc">{t("reports.resolvedIncidents", { count: payload.resolvedIncidentCount })}</div>
        </div>
        <div className="stat">
          <div className="stat-title">{t("reports.maintenanceCompleted")}</div>
          <div className="stat-value text-2xl">{payload.completedMaintenanceCount}</div>
          <div className="stat-desc">{t("reports.upcomingMaintenance", { count: payload.upcomingMaintenanceCount })}</div>
        </div>
        <div className="stat">
          <div className="stat-title">{t("reports.overallUptime")}</div>
          <div className="stat-value text-2xl">{payload.overallUptimePercent}%</div>
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
        <div role="alert" className="alert alert-error alert-soft">
          <span className="text-sm font-medium">{t("reports.atRisk", { count: payload.atRiskServiceSlugs.length })}</span>
        </div>
      )}

      {payload.keywordMatchCount > 0 && (
        <div className="text-base-content/60 flex flex-wrap gap-4 text-sm">
          <span>{t("reports.keywordMatches", { count: payload.keywordMatchCount })}</span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {payload.boards.map((board) => (
          <div key={board.boardId}>
            <h3 className="text-base-content/70 mb-2 text-sm font-semibold">{board.boardName}</h3>
            {board.services.length === 0 ? (
              <p className="text-base-content/40 text-xs">{t("reports.noServicesOnBoard")}</p>
            ) : (
              <div className="card card-border bg-base-200 overflow-x-auto p-2">
                <table className="table-sm table">
                  <thead>
                    <tr>
                      <th>{t("reports.table.service")}</th>
                      <th>{t("reports.table.incidents")}</th>
                      <th>{t("reports.table.maintenance")}</th>
                      <th>{t("reports.table.uptime")}</th>
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
                        <td>{service.incidentCount}</td>
                        {/* See ServiceReportEntry.maintenanceCount's own
                            comment — undefined means "not recorded" (a
                            report from before this field existed), shown
                            as a dash rather than a fabricated 0. */}
                        <td>{service.maintenanceCount ?? "–"}</td>
                        <td>{service.uptimePercent}%</td>
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
      </PageHeader>
    </div>
  );
}
