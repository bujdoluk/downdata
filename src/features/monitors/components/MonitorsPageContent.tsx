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
import MonitorsActiveIncidentsTimeline from "@/features/monitors/components/MonitorsActiveIncidentsTimeline";
import MonitorsMaintenanceTimeline from "@/features/monitors/components/MonitorsMaintenanceTimeline";
import MonitorsBoardSection from "@/features/monitors/components/MonitorsBoardSection";
import NoServicesMessage from "@/features/monitors/components/NoServicesMessage";
import StatusSummary from "@/features/monitors/components/StatusSummary";
import { PlusIcon } from "@/components/icons/NavIcons";
// Direct path: the boards barrel re-exports server-only services/boards.ts.
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
  // Keyed "<boardId>:<slug>": one service can appear in several board sections.
  const [removingSlugs, setRemovingSlugs] = useState<Set<string>>(new Set());
  // Own state so an add updates the grids immediately, before router.refresh() lands.
  const [boards, setBoards] = useState(initialBoards);
  const [syncedBoards, setSyncedBoards] = useState(initialBoards);
  if (initialBoards !== syncedBoards) {
    setSyncedBoards(initialBoards);
    setBoards(initialBoards);
  }

  const addServiceRef = useRef<HTMLDialogElement>(null);
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
  // Union with server trackedSlugs so services tracked outside this page's state still count.
  const effectiveTrackedSlugs = new Set([...trackedSlugs, ...boards.flatMap((b) => b.Slugs)]);
  const myServices = catalog.filter(
    (entry) => effectiveTrackedSlugs.has(entry.slug) && (!selectedBoard || selectedBoard.Slugs.includes(entry.slug)),
  );

  const { selectedBoardId } = useSelectedBoard();
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

  // Remove is always per-board; untracking from every board at once isn't offered.
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

  const timelineBoards = selectedBoard ? [selectedBoard] : boards;
  const showTimeline = boards.length > 0 && myServices.length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl 2xl:ml-auto 2xl:mr-0 2xl:max-w-[97.5rem]">
      <div className="flex w-full items-start gap-6">
        <div className="w-full max-w-6xl">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-base-content text-lg font-semibold">
              {t("monitors.myServices")} ({myServices.length})
            </h1>
            <button type="button" onClick={() => openAddService(selectedBoard?.id)} className="btn btn-info btn-sm 2xl:hidden">
              <PlusIcon />
              {t("monitors.addMonitor")}
            </button>
          </div>
          <p className="text-base-content/60 mt-1 text-sm">{t("services.subtitle")}</p>
        </div>
        <div className="hidden min-w-80 max-w-sm flex-1 justify-end 2xl:flex">
          <button type="button" onClick={() => openAddService(selectedBoard?.id)} className="btn btn-info btn-sm">
            <PlusIcon />
            {t("monitors.addMonitor")}
          </button>
        </div>
      </div>

      <div className="flex w-full items-start gap-6">
        <div className="w-full max-w-6xl">
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
                <div className="card card-border bg-base-200 mt-4 p-4 2xl:hidden">
                  <MonitorsActiveIncidentsTimeline boards={timelineBoards} data={data} />
                </div>
                <div className="card card-border bg-base-200 mt-4 p-4 2xl:hidden">
                  <MonitorsMaintenanceTimeline boards={timelineBoards} />
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <CatalogServiceGrid
                    catalog={myServices}
                    trackedHosts={[]}
                    data={data}
                    fetchFailed={fetchFailed}
                    removingSlugs={removingSlugsForBoard(selectedBoard.id)}
                    onRemove={(entry) => handleRemove(entry, selectedBoard.id)}
                    isFullWidth
                    sortAlertsToTop
                  />
                </div>
              </>
            )
          ) : (
            <>
              {myServices.length > 0 && <StatusSummary counts={overviewCounts} isLoading={!data && !fetchFailed} />}
              {showTimeline && (
                <div className="card card-border bg-base-200 mt-6 p-4 2xl:hidden">
                  <MonitorsActiveIncidentsTimeline boards={timelineBoards} data={data} />
                </div>
              )}
              {showTimeline && (
                <div className="card card-border bg-base-200 mt-4 p-4 2xl:hidden">
                  <MonitorsMaintenanceTimeline boards={timelineBoards} />
                </div>
              )}
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
        </div>

        {showTimeline && (
          <div className="mt-4 hidden min-w-80 max-w-sm flex-1 2xl:block">
            <div className="card card-border bg-base-200 p-4">
              <MonitorsActiveIncidentsTimeline boards={timelineBoards} data={data} />
            </div>
            <div className="card card-border bg-base-200 mt-4 p-4">
              <MonitorsMaintenanceTimeline boards={timelineBoards} />
            </div>
          </div>
        )}
      </div>

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
