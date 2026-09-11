"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { requestJson } from "@/lib/fetchJson";
import { formatDate, formatDateTime } from "@/lib/formatTime";
import { useTimeZone } from "@/hooks/useTimeZone";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "@/components/Pagination";
import { ExternalLinkIcon } from "@/components/icons/NavIcons";
import ReportSettingsForm from "@/features/reports/components/ReportSettingsForm";
import { useDebouncedSetting } from "@/features/reports/hooks/useDebouncedSetting";
import type { Board } from "@/types/board";
import type { ReportSettings, StoredReport } from "@/features/reports/types";

const PAGE_SIZE = 10;

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeZone = useTimeZone();

  const reports = initialReports;
  const page = Number(searchParams.get("page") ?? "1");
  const { totalPages, currentPage, pageItems: pageReports } = usePagination(reports, page, PAGE_SIZE);

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams);
    if (next === 1) params.delete("page");
    else params.set("page", String(next));
    router.push(`/reports${params.size > 0 ? `?${params}` : ""}`);
  }

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

  return (
    <div className="mx-auto w-full max-w-6xl self-start">
      <h1 className="text-xl font-semibold text-base-content">{t("reports.title")}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{t("reports.subtitle")}</p>

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

      {reports.length === 0 ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("reports.empty")}</p>
      ) : (
        <>
          <div className="card card-border bg-base-200 mt-4 overflow-x-auto p-2">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("reports.table.name")}</th>
                  <th>{t("reports.table.date")}</th>
                  <th className="w-10" aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {pageReports.map((report) => (
                  <tr
                    key={report.id}
                    tabIndex={0}
                    onClick={() => router.push(`/reports/${report.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") router.push(`/reports/${report.id}`);
                    }}
                    className="hover:bg-base-300 cursor-pointer"
                  >
                    <td>
                      <p className="text-base-content text-sm font-medium">{t(`reports.name.${report.interval}`)}</p>
                      <p className="text-base-content/50 text-xs">
                        {formatDate(report.periodStart)} – {formatDate(report.periodEnd)}
                      </p>
                    </td>
                    <td className="text-base-content/70 text-sm">{formatDateTime(report.generatedAt, timeZone)}</td>
                    <td>
                      <Link
                        href={`/reports/${report.id}`}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={t("reports.table.view")}
                        className="btn btn-ghost btn-sm btn-circle"
                      >
                        <ExternalLinkIcon />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onChange={goToPage}
              label={t("reports.pagination.label")}
              prevLabel={t("reports.pagination.previous")}
              nextLabel={t("reports.pagination.next")}
            />
          </div>
        </>
      )}
    </div>
  );
}
