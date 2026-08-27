"use client";

import { type ChangeEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { BoardIcon } from "@/components/icons/NavIcons";

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

  const createBoardMutation = useMutation({
    mutationFn: (name: string) =>
      fetchJson<Board>("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: (board) => {
      queryClient.setQueryData<Board[]>(queryKeys.boards.list(), (prev) =>
        [...(prev ?? []), board].sort((a, b) => a.name.localeCompare(b.name)),
      );
      router.push(`/boards/${board.id}`);
    },
  });

  // Distinct from selectValue below: this only reflects an actual board
  // detail page, for the icon's active-state color.
  const matchedBoardId = pathname?.match(/^\/boards\/([^/]+)/)?.[1] ?? "";
  // Defaults to "All boards" (VIEW_ALL), not the first board — a native
  // <select> never fires onChange when you reselect the value it's
  // already showing, so if this defaulted to a real board, clicking that
  // one specific board would silently do nothing.
  const selectValue = matchedBoardId || VIEW_ALL;

  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value === VIEW_ALL) {
      router.push("/boards");
      return;
    }
    if (value !== ADD_BOARD) {
      router.push(`/boards/${value}`);
      return;
    }

    const name = window.prompt(t("boards.newBoardName"))?.trim();
    if (!name) return;

    createBoardMutation.mutate(name);
  }

  return (
    <div className={`flex items-center gap-2 ${collapsed ? "" : "md:w-full"}`}>
      <span title={t("nav.boards")} className={`shrink-0 ${matchedBoardId ? "text-base-content" : "text-base-content/40"}`}>
        <BoardIcon className="shrink-0" />
      </span>
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
    </div>
  );
}
