"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";

export default function BoardCard({
  board,
  deleting,
  onDelete,
}: {
  board: Board;
  deleting: boolean;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  return (
    <li className="card card-border bg-base-200 hover:border-base-content/20 flex w-full flex-row items-center justify-between gap-3 p-4 shadow-md transition-colors">
      <Link href={`/boards/${board.id}`} className="min-w-0 flex-1">
        <p className="text-base-content truncate text-base font-semibold">{board.name}</p>
        <p className="text-base-content/50 mt-1 text-xs">
          {t("boards.serviceCount", { count: board.serviceSlugs.length })}
        </p>
      </Link>
      <button type="button" disabled={deleting} onClick={onDelete} className="btn btn-ghost btn-xs text-error shrink-0">
        {deleting ? t("boards.deleting") : t("boards.delete")}
      </button>
    </li>
  );
}
