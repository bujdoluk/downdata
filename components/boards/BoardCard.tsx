"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import { useBoardRename } from "@/lib/useBoardRename";

export default function BoardCard({
  board,
  incidentCount,
  maintenanceCount,
  deleting,
  onDelete,
}: {
  board: Board;
  incidentCount: number;
  maintenanceCount: number;
  deleting: boolean;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const rename = useBoardRename(board);

  return (
    <li className="card card-border bg-base-200 hover:border-base-content/20 flex w-full flex-row items-center justify-between gap-3 p-4 shadow-md transition-colors">
      {rename.isEditing ? (
        <>
          <input
            type="text"
            value={rename.nameDraft}
            onChange={(e) => rename.setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") rename.submit();
              if (e.key === "Escape") rename.cancel();
            }}
            placeholder={t("boards.namePlaceholder")}
            className="input input-bordered input-sm min-w-0 flex-1"
            autoFocus
          />
          <button type="button" disabled={rename.renaming} onClick={rename.submit} className="btn btn-info btn-xs shrink-0">
            {t("boards.rename")}
          </button>
        </>
      ) : (
        <>
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
          <button type="button" onClick={rename.startEditing} className="btn btn-ghost btn-xs shrink-0">
            {t("boards.rename")}
          </button>
          <button type="button" disabled={deleting} onClick={onDelete} className="btn btn-ghost btn-xs text-error shrink-0">
            {deleting ? t("boards.deleting") : t("boards.delete")}
          </button>
        </>
      )}
    </li>
  );
}
