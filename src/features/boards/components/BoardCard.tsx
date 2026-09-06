"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { Indicator } from "@/types/service";
import { PinIcon } from "@/components/icons/NavIcons";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/service/statusStyles";

export default function BoardCard({
  board,
  incidentCount,
  maintenanceCount,
  indicator,
  isLoading,
  isPinned,
  onTogglePin,
}: {
  board: Board;
  incidentCount: number;
  maintenanceCount: number;
  indicator: Indicator | undefined;
  isLoading: boolean;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
}) {
  const { t } = useTranslation();
  const style = indicator ? (INDICATOR_STYLES[indicator] ?? FALLBACK_STYLE) : FALLBACK_STYLE;
  const stripeColor = isLoading ? "bg-base-content/10" : style.dot;

  return (
    <li className="relative">
      <div className="card card-border bg-base-200 hover:border-base-content/20 flex w-full flex-row items-stretch overflow-hidden shadow-md transition-colors">
        <Link href={`/boards/${board.id}`} className="min-w-0 flex-1 p-4">
          <p className="text-base-content truncate text-base font-semibold">{board.name}</p>
          <div className="text-base-content/50 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
            <span>
              <span className="text-base-content text-sm font-bold">{board.Slugs.length}</span>{" "}
              {t("boards.serviceCountLabel", { count: board.Slugs.length })}
            </span>
            <span>
              <span className="text-base-content text-sm font-bold">{incidentCount}</span>{" "}
              {t("boards.incidentCountLabel", { count: incidentCount })}
            </span>
            <span>
              <span className="text-base-content text-sm font-bold">{maintenanceCount}</span>{" "}
              {t("boards.maintenanceCountLabel", { count: maintenanceCount })}
            </span>
          </div>
        </Link>
        <span
          className={`w-3 shrink-0 self-stretch ${stripeColor} ${isLoading ? "animate-pulse" : ""}`}
          title={t(style.labelKey)}
        />
      </div>
      <button
        type="button"
        onClick={() => onTogglePin(board.id)}
        aria-label={t(isPinned ? "incidents.unpin" : "incidents.pin")}
        className="text-base-content/40 hover:text-base-content absolute top-3 right-7 z-10 transition-transform hover:scale-110 active:scale-90"
      >
        <PinIcon className="h-4 w-4" filled={isPinned} />
      </button>
    </li>
  );
}
