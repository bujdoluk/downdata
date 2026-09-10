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
import { useDebouncedSetting } from "@/features/reports/hooks/useDebouncedSetting";
import { useSelectAndScrollOnMobile } from "@/hooks/useSelectAndScrollOnMobile";
import { useAutoSelectFirstId } from "@/hooks/useAutoSelectFirstId";
import type { Board } from "@/types/board";
import type { ReportSettings, StoredReport } from "@/features/reports/types";

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

  // Three independent, optimistic + debounced fields, not one shared
  // settings object with a disabled-while-saving flag — see
  // useDebouncedSetting's own comment for why. Each control updates
  // instantly on click and only actually persists ~500ms after the last
  // change to that same field, so rapid clicking doesn't disable
  // anything and doesn't fire one overlapping request per click either.
  const intervalSetting = useDebouncedSetting(initialSettings.interval, (nextInterval) =>
    requestJson<ReportSettings>("/api/reports/settings", t("reports.settings.somethingWrong"), { method: "PATCH", body: { interval: nextInterval } }).then((updated) => updated.interval),
  );
  const boardsSetting = useDebouncedSetting(initialSettings.excludedBoardIds, (nextExcludedBoardIds) =>
    requestJson<ReportSettings>("/api/reports/settings", t("reports.settings.somethingWrong"), { method: "PATCH", body: { excludedBoardIds: nextExcludedBoardIds } }).then(
      (updated) => updated.excludedBoardIds,
    ),
  );
  const emailNudgeSetting = useDebouncedSetting(initialSettings.emailNudgeEnabled, (nextEmailNudgeEnabled) =>
    requestJson<ReportSettings>("/api/reports/settings", t("reports.settings.somethingWrong"), { method: "PATCH", body: { emailNudgeEnabled: nextEmailNudgeEnabled } }).then(
      (updated) => updated.emailNudgeEnabled,
    ),
  );
  const settings: ReportSettings = { interval: intervalSetting.value, excludedBoardIds: boardsSetting.value, emailNudgeEnabled: emailNudgeSetting.value };

  const testMutation = useMutation({
    mutationFn: () => requestJson<{ sent: boolean }>("/api/reports/test", t("reports.settings.testFailed"), { method: "POST" }),
  });
  const testMessage = testMutation.isSuccess
    ? { text: t("reports.settings.testSent"), isError: false }
    : testMutation.isError
      ? { text: testMutation.error.message, isError: true }
      : null;

  function toggleBoard(boardId: string, included: boolean) {
    const current = new Set(boardsSetting.value);
    if (included) current.delete(boardId);
    else current.add(boardId);
    boardsSetting.set([...current]);
  }

  const header = (
    <ReportSettingsForm
      boards={boards}
      settings={settings}
      intervalError={intervalSetting.error}
      boardsError={boardsSetting.error}
      emailNudgeError={emailNudgeSetting.error}
      onChangeInterval={intervalSetting.set}
      onToggleBoard={toggleBoard}
      onToggleEmailNudge={emailNudgeSetting.set}
      isSendingTest={testMutation.isPending}
      testMessage={testMessage}
      onSendTest={() => testMutation.mutate()}
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
        listColumnWidth="third"
      />
    </div>
  );
}
