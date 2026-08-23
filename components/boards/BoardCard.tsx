"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";

export default function BoardCard({
  board,
  incidentCount,
  maintenanceCount,
}: {
  board: Board;
  incidentCount: number;
  maintenanceCount: number;
}) {
  const { t } = useTranslation();

  return (
    <li className="card card-border bg-base-200 hover:border-base-content/20 flex w-full flex-row items-center justify-between gap-3 p-4 shadow-md transition-colors">
      <Link href={`/boards/${board.id}`} className="min-w-0 flex-1">
        <p className="text-base-content truncate text-base font-semibold">{board.name}</p>
        <div className="text-base-content/50 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          <span>
            <span className="text-base-content text-sm font-bold">{board.serviceSlugs.length}</span>{" "}
            {t("boards.serviceCountLabel", { count: board.serviceSlugs.length })}
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
    </li>
  );
}
