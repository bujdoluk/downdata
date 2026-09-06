"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { useQueries } from "@tanstack/react-query";
import type { Board } from "@/types/board";
import type { BoardStatusPage } from "@/types/statusPage";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import BoardStatusPageSettings from "@/components/boards/BoardStatusPageSettings";

// One card per board, each wrapping the same BoardStatusPageSettings form
// the board detail grid used to show directly — that component is already
// "bare content, no outer sizing" (see its own header comment), so it
// drops into a normal-height card here unmodified.
export default function StatusPagesPageContent({ boards }: { boards: Board[] }) {
  const { t } = useTranslation();

  // Same query key each card's own BoardStatusPageSettings uses, so this
  // shares its cache entries instead of double-fetching — just read here
  // too, to aggregate a published count for the page title.
  const statusPageQueries = useQueries({
    queries: boards.map((board) => ({
      queryKey: queryKeys.boards.statusPage(board.id),
      queryFn: () => fetchJson<BoardStatusPage | null>(`/api/boards/${board.id}/status-page`),
    })),
  });
  const publishedCount = statusPageQueries.filter((query) => query.data?.enabled).length;

  return (
    <div className="mx-auto w-full max-w-3xl self-start">
      <h1 className="text-base-content text-lg font-semibold">
        {t("statusPages.title")} ({publishedCount})
      </h1>
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
