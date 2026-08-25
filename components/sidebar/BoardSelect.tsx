"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import { BoardIcon } from "@/components/icons/NavIcons";

const ADD_BOARD = "__add__";

export default function BoardSelect({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [boards, setBoards] = useState<Board[]>([]);

  useEffect(() => {
    // One-shot fetch, not usePolledFetch: this mounts on every dashboard
    // page, and boards only change on explicit create/rename/delete, so a
    // standing 60s poll here would just add egress for data that's already
    // kept in sync locally (see handleChange) or refreshed by navigation.
    fetch("/api/boards")
      .then((res) => (res.ok ? res.json() : []))
      .then(setBoards)
      .catch(() => {});
  }, []);

  const activeBoardId = pathname?.match(/^\/boards\/([^/]+)/)?.[1] ?? "";

  async function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value !== ADD_BOARD) {
      router.push(`/boards/${value}`);
      return;
    }

    const name = window.prompt(t("boards.newBoardName"))?.trim();
    if (!name) return;

    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return;

    const board: Board = await res.json();
    setBoards((prev) => [...prev, board].sort((a, b) => a.name.localeCompare(b.name)));
    router.push(`/boards/${board.id}`);
  }

  return (
    <div className={`flex items-center gap-2 ${collapsed ? "" : "md:w-full"}`}>
      <Link
        href="/boards"
        title={t("nav.boards")}
        className={`shrink-0 transition-colors ${activeBoardId ? "text-base-content" : "text-base-content/40 hover:text-base-content/70"}`}
      >
        <BoardIcon className="shrink-0" />
      </Link>
      {!collapsed && (
        <select
          className="select select-bordered select-sm hidden w-full md:inline-flex"
          aria-label={t("nav.boards")}
          value={activeBoardId}
          onChange={handleChange}
        >
          <option value="" disabled>
            {t("boards.yourFirstBoard")}
          </option>
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
