"use client";

import { useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { useQueries } from "@tanstack/react-query";
import type { Board } from "@/types/board";
import type { BoardStatusPage } from "@/features/status-pages/types";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { mergeParams } from "@/lib/mergeParams";
import { usePagination } from "@/hooks/usePagination";
import { useAutoSelectFirstId } from "@/hooks/useAutoSelectFirstId";
import { useSelectAndScrollOnMobile } from "@/hooks/useSelectAndScrollOnMobile";
import ListDetailShell from "@/components/ListDetailShell";
import Pagination from "@/components/Pagination";
import Spinner from "@/components/Spinner";
import BoardStatusPageSettings from "@/features/status-pages/components/BoardStatusPageSettings";

const PAGE_SIZE = 10;

// Master-detail so many boards don't become a wall of stacked forms. The list is
// navigate-only; all actions live in the open form.
export default function StatusPagesPageContent({ boards }: { boards: Board[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Same key as BoardStatusPageSettings, so the cache is shared rather than double-fetched.
  const statusPageQueries = useQueries({
    queries: boards.map((board) => ({
      queryKey: queryKeys.boards.statusPage(board.id),
      queryFn: () => fetchJson<BoardStatusPage | null>(`/api/boards/${board.id}/status-page`),
    })),
  });
  const statusPageByBoardId = useMemo(() => {
    const map = new Map<string, (typeof statusPageQueries)[number]>();
    boards.forEach((board, i) => map.set(board.id, statusPageQueries[i]!));
    return map;
  }, [boards, statusPageQueries]);
  const publishedCount = statusPageQueries.filter((query) => query.data?.enabled).length;

  const detailRef = useRef<HTMLDivElement>(null);
  const selectBoard = useSelectAndScrollOnMobile("/status-pages", detailRef);
  const selectedId = searchParams.get("id");
  useAutoSelectFirstId("/status-pages", selectedId, boards);
  const selectedBoard = boards.find((board) => board.id === selectedId);

  const page = Number(searchParams.get("page") ?? "1");
  const { listRef, minListHeight, totalPages, currentPage, pageItems: pageBoards } = usePagination(boards, page, PAGE_SIZE);

  function goToPage(next: number) {
    const params = mergeParams(searchParams, { page: next === 1 ? null : String(next) });
    router.push(`/status-pages?${params.toString()}`, { scroll: false });
  }

  const list = (
    <ul ref={listRef} style={{ minHeight: totalPages > 1 ? minListHeight : undefined }} className="flex flex-col gap-3">
      {pageBoards.map((board) => {
        const query = statusPageByBoardId.get(board.id);
        const statusPage = query?.data;
        const isSelected = board.id === selectedId;
        const isConfigured = !!statusPage;
        const isPublished = statusPage?.enabled ?? false;

        return (
          <li
            key={board.id}
            className={`card card-border bg-base-200 flex w-full flex-row items-center gap-2 p-3 shadow-md transition-colors ${
              isSelected ? "border-base-content" : "hover:border-base-content/20"
            }`}
          >
            <button
              type="button"
              onClick={() => selectBoard(board.id)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="text-base-content truncate text-sm font-medium">{board.name}</p>
                {query?.isLoading ? (
                  <Spinner size="xs" className="mt-1" />
                ) : !isConfigured ? (
                  <p className="text-base-content/50 text-xs">{t("statusPages.notSetUp")}</p>
                ) : isPublished ? (
                  <span className="badge badge-success badge-xs">{t("boards.statusPage.live")}</span>
                ) : (
                  <p className="text-base-content/50 text-xs">{t("boards.statusPage.notPublished")}</p>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const detail = !selectedBoard ? (
    <p className="text-base-content/50 text-sm">{t("statusPages.selectPrompt")}</p>
  ) : (
    <BoardStatusPageSettings key={selectedBoard.id} boardId={selectedBoard.id} boardName={selectedBoard.name} />
  );

  return (
    <ListDetailShell
      title={`${t("statusPages.title")} (${publishedCount})`}
      subtitle={t("statusPages.subtitle")}
      isLoading={false}
      isError={false}
      isEmpty={boards.length === 0}
      loadingLabel=""
      unreachableLabel=""
      emptyLabel={t("statusPages.empty")}
      filters={null}
      list={list}
      detailRef={detailRef}
      detail={detail}
      pagination={<Pagination currentPage={currentPage} totalPages={totalPages} onChange={goToPage} label={t("statusPages.pagination.label")} prevLabel={t("statusPages.pagination.previous")} nextLabel={t("statusPages.pagination.next")} />}
      listColumnWidth="third"
    />
  );
}
