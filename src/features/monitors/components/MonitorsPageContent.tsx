"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { Catalog, ServiceStatusBatchResponse } from "@/types/service";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { mergeParams } from "@/lib/mergeParams";
import { useSelectedBoard } from "@/hooks/useSelectedBoard";
import CatalogServiceGrid from "@/features/monitors/components/CatalogServiceGrid";
import MonitorsBoardSection from "@/features/monitors/components/MonitorsBoardSection";
import NoServicesMessage from "@/features/monitors/components/NoServicesMessage";
import StatusSummary from "@/features/monitors/components/StatusSummary";
import { PlusIcon } from "@/components/icons/NavIcons";
// Direct path, not @/features/boards's own barrel — that barrel also
// re-exports services/boards.ts (server-only, reads next/headers's
// cookies()), which breaks a client component's build the same way
// components/sidebar/BoardSelect.tsx's own comment already documents for
// CreateBoardModal.
import AddServiceModal from "@/features/boards/components/AddServiceModal";

const POLL_INTERVAL_MS = 60_000;

export default function MonitorsPageContent({
  catalog,
  trackedSlugs,
  boards: initialBoards,
}: {
  catalog: Catalog[];
  trackedSlugs: string[];
  boards: Board[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  // Keyed "<boardId>:<slug>", not plain slug — the same service can render
  // in two different boards' sections at once (see the remove comment
  // below), and a plain-slug key would show a spinner on a sibling
  // section's card for a removal that section had nothing to do with.
  const [removingSlugs, setRemovingSlugs] = useState<Set<string>>(new Set());
  // Own state, not just the server-provided prop — adding a service via the
  // modal below must update this page's own grids/counts immediately, not
  // only once router.refresh()'s server round trip resolves. Same reasoning
  // as BoardDetailContent's own board state.
  const [boards, setBoards] = useState(initialBoards);
  const [syncedBoards, setSyncedBoards] = useState(initialBoards);
  if (initialBoards !== syncedBoards) {
    setSyncedBoards(initialBoards);
    setBoards(initialBoards);
  }

  const addServiceRef = useRef<HTMLDialogElement>(null);
  // Which board the add-service modal opens pre-selected to — the currently
  // filtered board when adding from the header, or a specific board's own
  // section when adding from its empty state in the "all boards" view. The
  // modal's own dropdown (see AddServiceModal) still lets you switch away
  // from whichever this was.
  const [modalBoardId, setModalBoardId] = useState<string | undefined>(undefined);

  function openAddService(boardId?: string) {
    setModalBoardId(boardId);
    addServiceRef.current?.showModal();
  }

  function handleServiceAdded(updatedBoard: Board) {
    setBoards((prev) => prev.map((b) => (b.id === updatedBoard.id ? updatedBoard : b)));
    queryClient.invalidateQueries({ queryKey: queryKeys.catalogStatus() });
    router.refresh();
  }

  const boardId = searchParams.get("board") ?? "";
  const selectedBoard = boards.find((board) => board.id === boardId);
  // Union with the server-provided trackedSlugs (rather than only deriving
  // from `boards`) so a service tracked through some path other than this
  // page's own optimistic state — there's none today, but nothing enforces
  // that staying true — still counts.
  const effectiveTrackedSlugs = new Set([...trackedSlugs, ...boards.flatMap((b) => b.Slugs)]);
  const myServices = catalog.filter(
    (entry) => effectiveTrackedSlugs.has(entry.slug) && (!selectedBoard || selectedBoard.Slugs.includes(entry.slug)),
  );

  const { selectedBoardId } = useSelectedBoard();
  // No ?board= yet and the persisted cross-page pick (see
  // hooks/useSelectedBoard) still refers to a real board — apply it once,
  // same one-shot idiom used by the other board-aware pages.
  useEffect(() => {
    if (!searchParams.has("board") && selectedBoardId && boards.some((b) => b.id === selectedBoardId)) {
      router.replace(`/monitors?${mergeParams(searchParams, { board: selectedBoardId }).toString()}`, { scroll: false });
    }
  }, [searchParams, selectedBoardId, boards, router]);

  const { data, isError: fetchFailed } = useQuery({
    queryKey: queryKeys.catalogStatus(),
    queryFn: () => fetchJson<ServiceStatusBatchResponse>("/api/status/catalog", { cache: "no-store" }),
    refetchInterval: POLL_INTERVAL_MS,
  });

  // Always per-board now, whether removed from inside a section (the "all
  // boards" view) or from the flat single-board list (a ?board= filter) —
  // one meaning for Remove everywhere on this page. This is
  // DELETE /api/boards/[id]/services/[slug] (removeServiceFromBoard), not
  // the old account-wide /api/monitors/[slug] (removeServiceFromAllBoards,
  // now deleted) — untracking from every board at once is no longer
  // reachable from any UI.
  const removeMutation = useMutation({
    mutationFn: ({ entry, boardId: targetBoardId }: { entry: Catalog; boardId: string }) =>
      fetch(`/api/boards/${targetBoardId}/services/${entry.slug}`, { method: "DELETE" }),
    onSettled: (_data, _error, { entry, boardId: targetBoardId }) =>
      setRemovingSlugs((prev) => {
        const next = new Set(prev);
        next.delete(`${targetBoardId}:${entry.slug}`);
        return next;
      }),
    onSuccess: (res) => {
      if (!res.ok) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.catalogStatus() });
      router.refresh();
    },
  });

  function handleRemove(entry: Catalog, targetBoardId: string) {
    setRemovingSlugs((prev) => new Set(prev).add(`${targetBoardId}:${entry.slug}`));
    removeMutation.mutate({ entry, boardId: targetBoardId });
  }

  // A section only needs to know its own board's pending removals, not the
  // whole page's — strips the composite key back down to a plain slug so
  // CatalogServiceGrid's existing removingSlugs contract stays unchanged.
  function removingSlugsForBoard(targetBoardId: string): Set<string> {
    const prefix = `${targetBoardId}:`;
    const result = new Set<string>();
    for (const key of removingSlugs) {
      if (key.startsWith(prefix)) result.add(key.slice(prefix.length));
    }
    return result;
  }

  const overviewCounts = { critical: 0, major: 0, minor: 0, none: 0 };
  if (data) {
    for (const entry of myServices) {
      const status = data[entry.slug];
      if (!status || !("status" in status)) continue;
      const indicator = status.status.indicator;
      if (indicator === "critical" || indicator === "major" || indicator === "minor" || indicator === "none") {
        overviewCounts[indicator]++;
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl self-start">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-base-content text-lg font-semibold">
          {t("monitors.myServices")} ({myServices.length})
        </h1>
        <button type="button" onClick={() => openAddService(selectedBoard?.id)} className="btn btn-info btn-sm">
          <PlusIcon />
          {t("monitors.addMonitor")}
        </button>
      </div>
      <p className="text-base-content/60 mt-1 text-sm">{t("services.subtitle")}</p>

      {boards.length === 0 ? (
        <div className="mt-4">
          <NoServicesMessage onAddClick={() => openAddService()} />
        </div>
      ) : selectedBoard ? (
        myServices.length === 0 ? (
          <div className="mt-4">
            <NoServicesMessage board={selectedBoard} onAddClick={() => openAddService(selectedBoard.id)} />
          </div>
        ) : (
          <>
            <StatusSummary counts={overviewCounts} isLoading={!data && !fetchFailed} />
            <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),370px))] gap-4">
              <CatalogServiceGrid
                catalog={myServices}
                trackedHosts={[]}
                data={data}
                fetchFailed={fetchFailed}
                removingSlugs={removingSlugsForBoard(selectedBoard.id)}
                onRemove={(entry) => handleRemove(entry, selectedBoard.id)}
              />
            </div>
          </>
        )
      ) : (
        <>
          {myServices.length > 0 && <StatusSummary counts={overviewCounts} isLoading={!data && !fetchFailed} />}
          <div className="mt-6 flex flex-col gap-8">
            {boards.map((board) => (
              <MonitorsBoardSection
                key={board.id}
                board={board}
                entries={catalog.filter((entry) => board.Slugs.includes(entry.slug))}
                data={data}
                fetchFailed={fetchFailed}
                removingSlugs={removingSlugsForBoard(board.id)}
                onRemove={(entry) => handleRemove(entry, board.id)}
                onAddService={() => openAddService(board.id)}
              />
            ))}
          </div>
        </>
      )}

      <AddServiceModal
        dialogRef={addServiceRef}
        boards={boards}
        initialBoardId={modalBoardId}
        catalog={catalog}
        onAdded={handleServiceAdded}
      />
    </div>
  );
}
