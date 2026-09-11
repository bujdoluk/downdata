"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { BoardIcon } from "@/components/icons/NavIcons";
import { useSelectedBoard } from "@/hooks/useSelectedBoard";
import SelectDropdown from "@/components/SelectDropdown";
// Direct path, not the features/boards barrel — that barrel also re-exports
// services/boards.ts (server-only, reads next/headers's cookies()), and
// Next's client/server boundary check fails on importing anything from a
// barrel that transitively touches server-only code, even an unrelated
// named export.
import CreateBoardModal from "@/features/boards/components/CreateBoardModal";

const ADD_BOARD = "__add__";
const VIEW_ALL = "__all__";

export default function BoardSelect({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // One-shot fetch, no refetchInterval: this mounts on every dashboard
  // page, and boards only change on explicit create/rename/delete, so a
  // standing 60s poll here would just add egress for data that's already
  // kept in sync locally (see CreateBoardModal's onCreated below) or
  // refreshed by navigation.
  const { data: boards = [] } = useQuery({
    queryKey: queryKeys.boards.list(),
    queryFn: () => fetchJson<Board[]>("/api/boards").catch(() => []),
  });

  const { selectedBoardId, setSelectedBoardId } = useSelectedBoard();
  const createBoardRef = useRef<HTMLDialogElement>(null);

  // Distinct from selectValue below: this only reflects an actual board
  // detail page, for the icon's active-state color.
  const matchedBoardId = pathname?.match(/^\/boards\/([^/]+)/)?.[1] ?? "";
  // The literal "all boards" list page always means VIEW_ALL, regardless of
  // whatever board was last picked elsewhere — it's not just another
  // board-aware page falling back to the persisted pick.
  const isBoardsIndex = pathname === "/boards";
  // Falls back to the persisted cross-page pick (see hooks/useSelectedBoard),
  // then "All boards" (VIEW_ALL).
  const selectValue = isBoardsIndex ? VIEW_ALL : matchedBoardId || selectedBoardId || VIEW_ALL;

  // Arriving at a board page any way — a BoardCard click on /boards,
  // browser back/forward, not just this dropdown — keeps the persisted
  // default in sync too, so every other board-aware page picks it up next.
  useEffect(() => {
    if (matchedBoardId && matchedBoardId !== selectedBoardId) setSelectedBoardId(matchedBoardId);
  }, [matchedBoardId, selectedBoardId, setSelectedBoardId]);

  // Same idea in the other direction: landing on /boards by ANY route (not
  // just this component's own Link below, which already clears it
  // optimistically on click) should stop other board-aware pages from
  // still defaulting to whatever board was picked before — a browser-back
  // or BoardDetailContent's own "← Back" link both bypass that onClick.
  useEffect(() => {
    if (isBoardsIndex && selectedBoardId) setSelectedBoardId("");
  }, [isBoardsIndex, selectedBoardId, setSelectedBoardId]);

  // SelectDropdown closes its own dropdown after calling this — no need to
  // manage that here (it used to be this function's own first line, back
  // when this was a hand-rolled details/summary/ul instead of that shared
  // component).
  function handleSelect(value: string) {
    if (value === VIEW_ALL) {
      setSelectedBoardId("");
      router.push("/boards");
      return;
    }
    if (value !== ADD_BOARD) {
      setSelectedBoardId(value);
      router.push(`/boards/${value}`);
      return;
    }

    createBoardRef.current?.showModal();
  }

  return (
    <div className={`flex items-center gap-2 ${collapsed ? "" : "md:w-full"}`}>
      <Link
        href="/boards"
        onClick={() => setSelectedBoardId("")}
        title={t("nav.boards")}
        className={`shrink-0 transition-colors ${matchedBoardId ? "text-base-content" : "text-base-content/40 hover:text-base-content/70"}`}
      >
        <BoardIcon className="shrink-0" />
      </Link>
      {!collapsed && (
        <SelectDropdown
          value={selectValue}
          onChange={handleSelect}
          ariaLabel={t("nav.boards")}
          className="w-full"
          menuClassName="w-56"
          wrapperClassName="hidden w-full md:inline-flex"
          options={[
            { value: VIEW_ALL, label: t("boards.allBoards") },
            ...boards.map((board) => ({ value: board.id, label: board.name })),
            // A colored span on the label, not a className on the option
            // itself — SelectDropdown doesn't expose per-option styling,
            // and this is the only option that needs to stand out anyway.
            { value: ADD_BOARD, label: <span className="text-info font-medium">{`+ ${t("boards.addBoard")}`}</span> },
          ]}
        />
      )}

      <CreateBoardModal
        dialogRef={createBoardRef}
        boards={boards}
        onCreated={(board) => {
          queryClient.setQueryData<Board[]>(queryKeys.boards.list(), (prev) =>
            [...(prev ?? []), board].sort((a, b) => a.name.localeCompare(b.name)),
          );
          setSelectedBoardId(board.id);
          router.push(`/boards/${board.id}`);
        }}
      />
    </div>
  );
}
