"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
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
  isPending,
  onChangeInterval,
  onToggleBoard,
  onToggleEmailNudge,
}: {
  boards: Board[];
  settings: ReportSettings;
  isPending: boolean;
  onChangeInterval: (interval: ReportInterval) => void;
  onToggleBoard: (boardId: string, included: boolean) => void;
  onToggleEmailNudge: (enabled: boolean) => void;
}) {
  const { t } = useTranslation();
  const excluded = new Set(settings.excludedBoardIds);

  return (
    <div className="card card-border bg-base-200 mt-4 flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-base-content/50 text-xs font-semibold tracking-wide uppercase">{t("reports.settings.interval")}</span>
        <div className="join">
          {INTERVALS.map((interval) => (
            <button
              key={interval}
              type="button"
              disabled={isPending}
              onClick={() => onChangeInterval(interval)}
              className={`btn join-item btn-sm ${settings.interval === interval ? "btn-primary" : "btn-outline"}`}
            >
              {t(`reports.settings.${interval}`)}
            </button>
          ))}
        </div>
      </div>

      {boards.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-base-content/50 text-xs font-semibold tracking-wide uppercase">{t("reports.settings.boards")}</span>
          <div className="flex flex-wrap items-center gap-4">
            {boards.map((board) => (
              <label key={board.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={!excluded.has(board.id)}
                  disabled={isPending}
                  onChange={(e) => onToggleBoard(board.id, e.target.checked)}
                />
                {board.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="toggle toggle-primary toggle-sm"
          checked={settings.emailNudgeEnabled}
          disabled={isPending}
          onChange={(e) => onToggleEmailNudge(e.target.checked)}
        />
        {t("reports.settings.emailNudge")}
      </label>
    </div>
  );
}
