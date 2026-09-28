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

// Its own page (/reports/[id]), not a ListDetailShell column: the email nudge
// needs a permalink that works cold.
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
      // Server Component prop, not a query cache: refresh so /reports doesn't
      // serve a router-cached render still showing the deleted report.
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
            {/* Period bounds are plain dates; generatedAt is an instant, so it needs the timezone. */}
            <p className="text-base-content/50 mt-1 text-xs">
              {formatDate(report.periodStart)} – {formatDate(report.periodEnd)} ·{" "}
              {t("reports.generatedOn", { date: formatDateTime(report.generatedAt, timeZone) })}
            </p>
          </div>
          <button type="button" disabled={deleteMutation.isPending} onClick={() => confirmRef.current?.showModal()} className="btn btn-error btn-outline btn-sm shrink-0">
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
          <span className="text-sm font-medium break-words">{t("reports.atRisk", { count: payload.atRiskServiceSlugs.length })}</span>
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
                        {/* undefined = not recorded (older report), shown as a dash, not a fake 0. */}
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
