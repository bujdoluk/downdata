"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Catalog } from "@/types/service";
import type { Board } from "@/types/board";
import CatalogBrowser from "@/components/service/CatalogBrowser";
import CustomServiceForm from "@/components/service/CustomServiceForm";
import { queryKeys } from "@/lib/queryKeys";

type Tab = "service" | "website";

export default function ServiceCatalogPicker({
  catalog,
  boards: initialBoards,
  initialBoardId,
}: {
  catalog: Catalog[];
  boards: Board[];
  initialBoardId?: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("service");
  const [boards, setBoards] = useState(initialBoards);
  const [boardId, setBoardId] = useState(initialBoardId ?? initialBoards[0]?.id);
  const [query, setQuery] = useState("");

  function applyUpdatedBoard(updatedBoard: Board) {
    setBoards((prev) => prev.map((board) => (board.id === updatedBoard.id ? updatedBoard : board)));
    queryClient.invalidateQueries({ queryKey: queryKeys.catalogStatus() });
    router.refresh();
  }

  const board = boards.find((b) => b.id === boardId);
  // Doubles as both "already on this board" (isMonitored, unused while
  // adding) and "just added" (the button's checkmark) — both are exactly
  // the same set once board state updates on a successful add, so there's
  // no separate optimistic-UI state to keep in sync.
  const addedHosts = new Set(catalog.filter((entry) => board?.Slugs.includes(entry.slug)).map((entry) => entry.host));

  const addMutation = useMutation({
    mutationFn: async (entry: Catalog) => {
      if (!boardId) throw new Error(t("addService.pickBoardFirst"));
      const res = await fetch(`/api/boards/${boardId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: entry.slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("addService.somethingWrong"));
      return { entry, board: data as Board };
    },
    onSuccess: ({ board: updatedBoard }) => applyUpdatedBoard(updatedBoard),
  });

  function handleAdd(entry: Catalog) {
    addMutation.mutate(entry);
  }

  return (
    <div className="flex w-full max-w-6xl flex-col self-start">
      <Link href="/boards" className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium">
        {t("addService.back")}
      </Link>

      <h1 className="text-base-content mt-2 text-lg font-semibold">{t("addService.title")}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{t("addService.subtitle")}</p>

      <div className="mt-4 flex max-w-xs flex-col gap-1">
        <label htmlFor="add-service-board" className="text-base-content/60 text-xs">
          {t("addService.board")}
        </label>
        <select
          id="add-service-board"
          value={boardId ?? ""}
          onChange={(e) => setBoardId(e.target.value)}
          className="select select-bordered select-sm"
        >
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div role="tablist" className="tabs tabs-box mt-4 w-fit">
        <button
          type="button"
          role="tab"
          onClick={() => setTab("service")}
          className={`tab ${tab === "service" ? "tab-active" : ""}`}
        >
          {t("addService.tabService")}
        </button>
        <button
          type="button"
          role="tab"
          onClick={() => setTab("website")}
          className={`tab ${tab === "website" ? "tab-active" : ""}`}
        >
          {t("addService.tabWebsite")}
        </button>
      </div>

      {tab === "website" ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("addService.websiteComingSoon")}</p>
      ) : (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("nav.searchPlaceholder")}
            className="input input-bordered input-sm mt-4 w-full max-w-sm"
            autoFocus
          />

          {addMutation.isError && (
            <div role="alert" className="alert alert-error alert-soft mt-3 py-2 text-xs">
              <span>{addMutation.error.message}</span>
            </div>
          )}

          <CustomServiceForm boardId={boardId} onAdded={applyUpdatedBoard} />

          <div className="mt-4">
            <CatalogBrowser
              catalog={catalog}
              trackedHosts={[]}
              pendingHost={addMutation.isPending ? (addMutation.variables?.host ?? null) : null}
              addedHosts={addedHosts}
              onAdd={handleAdd}
              query={query}
            />
          </div>
        </>
      )}
    </div>
  );
}
