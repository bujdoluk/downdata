"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import Spinner from "@/components/Spinner";
import type { Board } from "@/types/board";
import type { ReportInterval, ReportSettings } from "@/features/reports/types";

const INTERVALS: ReportInterval[] = ["daily", "weekly", "monthly"];

// The settings panel for /reports — interval choice, which boards feed
// into the report (an exclusion list under the hood, see
// ReportSettings.excludedBoardIds), and the opt-out nudge-email toggle.
// Kept as one panel rather than three, since all three are "how this
// feature behaves for me", not separate concerns.
export default function ReportSettingsForm({
  boards,
  settings,
  intervalError,
  boardsError,
  emailNudgeError,
  onChangeInterval,
  onToggleBoard,
  onToggleEmailNudge,
  isSendingTest,
  testMessage,
  onSendTest,
}: {
  boards: Board[];
  settings: ReportSettings;
  // Three independent error slots, not a disabled-while-saving flag —
  // each section is optimistic + debounced (see useDebouncedSetting), so
  // there's nothing to disable; a failed save rolls its own value back
  // and surfaces its own message here, without touching the other two.
  intervalError: string | null;
  boardsError: string | null;
  emailNudgeError: string | null;
  onChangeInterval: (interval: ReportInterval) => void;
  onToggleBoard: (boardId: string, included: boolean) => void;
  onToggleEmailNudge: (enabled: boolean) => void;
  isSendingTest: boolean;
  // null once the last result has been superseded by a new send or never
  // shown yet — kept as { text, isError } rather than two separate props
  // since exactly one of the two is ever shown at a time.
  testMessage: { text: string; isError: boolean } | null;
  onSendTest: () => void;
}) {
  const { t } = useTranslation();
  const excluded = new Set(settings.excludedBoardIds);

  return (
    <div className="card card-border bg-base-200 mt-4 flex flex-col gap-4 p-4">
      <p className="text-base-content/50 text-xs">{t("reports.settings.autoSaveNote")}</p>

      <div className="flex flex-col gap-2">
        <span className="text-base-content/50 text-xs font-semibold tracking-wide uppercase">{t("reports.settings.interval")}</span>
        <div className="join">
          {INTERVALS.map((interval) => (
            <button
              key={interval}
              type="button"
              onClick={() => onChangeInterval(interval)}
              className={`btn join-item btn-sm ${settings.interval === interval ? "btn-info" : "btn-outline btn-info"}`}
            >
              {t(`reports.settings.${interval}`)}
            </button>
          ))}
        </div>
        {intervalError && <p className="text-error text-xs">{intervalError}</p>}
      </div>

      {boards.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-base-content/50 text-xs font-semibold tracking-wide uppercase">{t("reports.settings.boards")}</span>
          <div className="flex flex-wrap items-center gap-4">
            {boards.map((board) => (
              <label key={board.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="checkbox checkbox-info checkbox-sm"
                  checked={!excluded.has(board.id)}
                  onChange={(e) => onToggleBoard(board.id, e.target.checked)}
                />
                {board.name}
              </label>
            ))}
          </div>
          {boardsError && <p className="text-error text-xs">{boardsError}</p>}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-base-content/50 text-xs font-semibold tracking-wide uppercase">{t("reports.settings.email")}</span>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="toggle toggle-info toggle-sm"
              checked={settings.emailNudgeEnabled}
              onChange={(e) => onToggleEmailNudge(e.target.checked)}
            />
            {t("reports.settings.emailNudge")}
          </label>
          <div className="flex flex-col items-end gap-1">
            <button type="button" className="btn btn-info btn-outline btn-xs" disabled={isSendingTest} onClick={onSendTest}>
              {isSendingTest ? (
                <span className="inline-flex items-center gap-1.5">
                  <Spinner size="xs" />
                  {t("reports.settings.sendingTest")}
                </span>
              ) : (
                t("reports.settings.sendTest")
              )}
            </button>
            <p className="text-base-content/50 max-w-48 text-right text-xs">{t("reports.settings.testCaption")}</p>
            {testMessage && <span className={`text-xs ${testMessage.isError ? "text-error" : "text-success"}`}>{testMessage.text}</span>}
          </div>
        </div>
        {emailNudgeError && <p className="text-error text-xs">{emailNudgeError}</p>}
      </div>
    </div>
  );
}
