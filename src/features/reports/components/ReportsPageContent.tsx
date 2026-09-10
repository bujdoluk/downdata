"use client";

import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { requestJson } from "@/lib/fetchJson";
import { formatDate } from "@/lib/formatTime";
import ListDetailShell from "@/components/ListDetailShell";
import ReportSettingsForm from "@/features/reports/components/ReportSettingsForm";
import ReportDetail from "@/features/reports/components/ReportDetail";
import { useSelectAndScrollOnMobile } from "@/hooks/useSelectAndScrollOnMobile";
import { useAutoSelectFirstId } from "@/hooks/useAutoSelectFirstId";
import type { Board } from "@/types/board";
import type { ReportInterval, ReportSettings, StoredReport } from "@/features/reports/types";

export default function ReportsPageContent({
  boards,
  initialSettings,
  initialReports,
}: {
  boards: Board[];
  initialSettings: ReportSettings;
  initialReports: StoredReport[];
}) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const reports = initialReports;
  const selected = reports.find((report) => report.id === selectedId);

  const detailRef = useRef<HTMLDivElement>(null);
  const selectReport = useSelectAndScrollOnMobile("/reports", detailRef);
  useAutoSelectFirstId("/reports", selectedId, reports);

  const settingsMutation = useMutation({
    mutationFn: (patch: Partial<{ interval: ReportInterval; excludedBoardIds: string[]; emailNudgeEnabled: boolean }>) =>
      requestJson<ReportSettings>("/api/reports/settings", t("reports.settings.somethingWrong"), { method: "PATCH", body: patch }),
  });

  function toggleBoard(boardId: string, included: boolean) {
    const current = new Set((settingsMutation.data ?? initialSettings).excludedBoardIds);
    if (included) current.delete(boardId);
    else current.add(boardId);
    settingsMutation.mutate({ excludedBoardIds: [...current] });
  }

  const header = (
    <ReportSettingsForm
      boards={boards}
      settings={settingsMutation.data ?? initialSettings}
      isPending={settingsMutation.isPending}
      onChangeInterval={(interval) => settingsMutation.mutate({ interval })}
      onToggleBoard={toggleBoard}
      onToggleEmailNudge={(emailNudgeEnabled) => settingsMutation.mutate({ emailNudgeEnabled })}
    />
  );

  const list = (
    <ul className="flex flex-col gap-3">
      {reports.map((report) => {
        const isSelected = report.id === selectedId;
        return (
          <li key={report.id}>
            <button
              type="button"
              onClick={() => selectReport(report.id)}
              className={`card card-border bg-base-200 flex w-full flex-row items-center justify-between gap-2 p-4 text-left shadow-md transition-colors ${
                isSelected ? "border-primary" : "hover:border-base-content/20"
              }`}
            >
              <div>
                <p className="text-base-content text-sm font-medium">
                  {formatDate(report.periodStart)} – {formatDate(report.periodEnd)}
                </p>
                <p className="text-base-content/50 text-xs">{t(`reports.settings.${report.interval}`)}</p>
              </div>
              <div className="text-right">
                <p className="text-base-content text-sm font-semibold">{report.payload.overallUptimePercent}%</p>
                {report.payload.atRiskServiceSlugs.length > 0 && <span className="badge badge-xs badge-error">{report.payload.atRiskServiceSlugs.length}</span>}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const detail = selected ? <ReportDetail report={selected} /> : <p className="text-base-content/50 text-sm">{t("reports.selectPrompt")}</p>;

  return (
    <div className="w-full self-start">
      <ListDetailShell
        title={t("reports.title")}
        subtitle={t("reports.subtitle")}
        header={header}
        isLoading={false}
        isError={false}
        isEmpty={reports.length === 0}
        loadingLabel=""
        unreachableLabel=""
        emptyLabel={t("reports.empty")}
        filters={null}
        list={list}
        detailRef={detailRef}
        detail={detail}
      />
    </div>
  );
}
