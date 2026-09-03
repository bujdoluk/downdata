"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import BoardStatusPageSettings from "@/components/boards/BoardStatusPageSettings";

// One card per board, each wrapping the same BoardStatusPageSettings form
// the board detail grid used to show directly — that component is already
// "bare content, no outer sizing" (see its own header comment), so it
// drops into a normal-height card here unmodified.
export default function StatusPagesPageContent({ boards }: { boards: Board[] }) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-3xl self-start">
      <h1 className="text-base-content text-lg font-semibold">{t("statusPages.title")}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{t("statusPages.subtitle")}</p>

      {boards.length === 0 ? (
        <p className="text-base-content/50 mt-6 text-sm">{t("statusPages.empty")}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {boards.map((board) => (
            <div key={board.id} className="card card-border bg-base-200 p-4">
              <h2 className="text-base-content text-sm font-semibold">{board.name}</h2>
              <div className="mt-3">
                <BoardStatusPageSettings boardId={board.id} boardName={board.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
