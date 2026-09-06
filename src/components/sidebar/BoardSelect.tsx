"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { BoardIcon } from "@/components/icons/NavIcons";
import { useSelectedBoard } from "@/hooks/useSelectedBoard";
import Spinner from "@/components/Spinner";

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
  // kept in sync locally (see the create-board mutation below) or
  // refreshed by navigation.
  const { data: boards = [] } = useQuery({
    queryKey: queryKeys.boards.list(),
    queryFn: () => fetchJson<Board[]>("/api/boards").catch(() => []),
  });

  const { selectedBoardId, setSelectedBoardId } = useSelectedBoard();
  const createBoardRef = useRef<HTMLDialogElement>(null);
  const [newBoardName, setNewBoardName] = useState("");

  const createBoardMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("addService.somethingWrong"));
      return data as Board;
    },
    onSuccess: (board) => {
      queryClient.setQueryData<Board[]>(queryKeys.boards.list(), (prev) =>
        [...(prev ?? []), board].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setNewBoardName("");
      createBoardRef.current?.close();
      setSelectedBoardId(board.id);
      router.push(`/boards/${board.id}`);
    },
  });

  // Distinct from selectValue below: this only reflects an actual board
  // detail page, for the icon's active-state color.
  const matchedBoardId = pathname?.match(/^\/boards\/([^/]+)/)?.[1] ?? "";
  // The literal "all boards" list page always means VIEW_ALL, regardless of
  // whatever board was last picked elsewhere — it's not just another
  // board-aware page falling back to the persisted pick.
  const isBoardsIndex = pathname === "/boards";
  // Falls back to the persisted cross-page pick (see hooks/useSelectedBoard),
  // then "All boards" (VIEW_ALL) — a native <select> never fires onChange
  // when you reselect the value it's already showing, so if this defaulted
  // to a real board, clicking that one specific board would silently do
  // nothing.
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

  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
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

    setNewBoardName("");
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
        <select
          className="select select-bordered select-sm hidden w-full md:inline-flex"
          aria-label={t("nav.boards")}
          value={selectValue}
          onChange={handleChange}
        >
          <option value={VIEW_ALL}>{t("boards.allBoards")}</option>
          {boards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
          <option value={ADD_BOARD} className="bg-info text-info-content">
            {`+ ${t("boards.addBoard")}`}
          </option>
        </select>
      )}

      <dialog ref={createBoardRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">{t("boards.addBoard")}</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = newBoardName.trim();
              if (!trimmed) return;
              createBoardMutation.mutate(trimmed);
            }}
            className="mt-4"
          >
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder={t("boards.namePlaceholder")}
              className="input input-bordered w-full"
              autoFocus
            />
            {createBoardMutation.isError && <p className="text-error mt-2 text-sm">{createBoardMutation.error.message}</p>}
            <div className="modal-action">
              <button type="button" onClick={() => createBoardRef.current?.close()} className="btn btn-sm">
                {t("boards.cancel")}
              </button>
              <button type="submit" disabled={createBoardMutation.isPending || !newBoardName.trim()} className="btn btn-info btn-sm">
                {createBoardMutation.isPending ? <Spinner size="xs" /> : t("boards.createSubmit")}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>{t("boards.cancel")}</button>
        </form>
      </dialog>
    </div>
  );
}
