"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";

export default function BoardFilterSelect({
  boards,
  value,
  onChange,
}: {
  boards: Board[];
  value: string;
  onChange: (boardId: string) => void;
}) {
  const { t } = useTranslation();
  if (boards.length === 0) return null;

  return (
    <select
      className="select select-bordered select-sm w-40"
      aria-label={t("incidents.filter.board")}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{t("incidents.filter.allBoards")}</option>
      {boards.map((board) => (
        <option key={board.id} value={board.id}>
          {board.name}
        </option>
      ))}
    </select>
  );
}
