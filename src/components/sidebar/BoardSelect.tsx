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
// Not the features/boards barrel: it re-exports server-only code, which breaks a client import.
import CreateBoardModal from "@/features/boards/components/CreateBoardModal";

const ADD_BOARD = "__add__";
const VIEW_ALL = "__all__";

export default function BoardSelect({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // No refetchInterval: mounts on every page and boards only change on explicit
  // create/rename/delete, which are synced locally.
  const { data: boards = [] } = useQuery({
    queryKey: queryKeys.boards.list(),
    queryFn: () => fetchJson<Board[]>("/api/boards").catch(() => []),
  });

  const { selectedBoardId, setSelectedBoardId } = useSelectedBoard();
  const createBoardRef = useRef<HTMLDialogElement>(null);

  const matchedBoardId = pathname?.match(/^\/boards\/([^/]+)/)?.[1] ?? "";
  // /boards always means VIEW_ALL, never the persisted pick.
  const isBoardsIndex = pathname === "/boards";
  const selectValue = isBoardsIndex ? VIEW_ALL : matchedBoardId || selectedBoardId || VIEW_ALL;

  // Sync the persisted pick however a board page was reached, not just via this dropdown.
  useEffect(() => {
    if (matchedBoardId && matchedBoardId !== selectedBoardId) setSelectedBoardId(matchedBoardId);
  }, [matchedBoardId, selectedBoardId, setSelectedBoardId]);

  // Browser back or other "Back" links bypass the Link's onClick clear below.
  useEffect(() => {
    if (isBoardsIndex && selectedBoardId) setSelectedBoardId("");
  }, [isBoardsIndex, selectedBoardId, setSelectedBoardId]);

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
            // SelectDropdown has no per-option styling, so color the label itself.
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
