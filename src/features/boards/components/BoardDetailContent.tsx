"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { Catalog, ServiceStatusBatchResponse, TrackedIncidentSummary, TrackedMaintenanceSummary } from "@/types/service";
import type { IncidentCountByService } from "@/lib/getStoredIncident";
import { fetchJson, postJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { useBoardRename } from "@/features/boards/hooks/useBoardRename";
import { useTimeZone } from "@/hooks/useTimeZone";
import { isActiveIncident } from "@/features/boards/services/isActiveIncident";
import StatusSummary from "@/features/monitors/components/StatusSummary";
import NoServicesMessage from "@/features/monitors/components/NoServicesMessage";
import BoardActiveIncidentsPanel from "@/features/boards/components/BoardActiveIncidentsPanel";
import BoardActiveMaintenancePanel from "@/features/boards/components/BoardActiveMaintenancePanel";
import BoardTrackedServicesGrid from "@/features/boards/components/BoardTrackedServicesGrid";
import BoardSuggestedServices from "@/features/boards/components/BoardSuggestedServices";
import AddServiceModal from "@/features/boards/components/AddServiceModal";
import BoardStatusPageSummary from "@/features/status-pages/components/BoardStatusPageSummary";
import IncidentCountsChart from "@/features/history/components/IncidentCountsChart";
import Spinner from "@/components/Spinner";
import ModalCloseButton from "@/components/ModalCloseButton";
import PageHeader from "@/components/PageHeader";
import { InfoIcon, PencilIcon } from "@/components/icons/NavIcons";

const POLL_INTERVAL_MS = 60_000;

export default function BoardDetailContent({
  board: initialBoard,
  catalog,
  boardCount,
}: {
  board: Board;
  catalog: Catalog[];
  boardCount: number;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  // Local state so an add updates the layout before router.refresh() lands.
  const [board, setBoard] = useState(initialBoard);
  // Re-sync during render when a fresh prop lands (see AGENTS.md Failure log, page→modal).
  const [syncedBoard, setSyncedBoard] = useState(initialBoard);
  if (initialBoard !== syncedBoard) {
    setSyncedBoard(initialBoard);
    setBoard(initialBoard);
  }
  const { data, isError: fetchFailed } = useQuery({
    queryKey: queryKeys.catalogStatus(),
    queryFn: () => fetchJson<ServiceStatusBatchResponse>("/api/status/catalog", { cache: "no-store" }),
    refetchInterval: POLL_INTERVAL_MS,
  });
  const rename = useBoardRename(board);
  const timeZone = useTimeZone();
  const confirmRef = useRef<HTMLDialogElement>(null);
  const addServiceRef = useRef<HTMLDialogElement>(null);

  function handleServiceAdded(updatedBoard: Board) {
    setBoard(updatedBoard);
    queryClient.invalidateQueries({ queryKey: queryKeys.catalogStatus() });
    router.refresh();
  }

  const { data: incidentsData } = useQuery({
    queryKey: queryKeys.incidents.list(),
    queryFn: () => fetchJson<{ incidents: TrackedIncidentSummary[] }>("/api/incidents", { cache: "no-store" }),
    refetchInterval: POLL_INTERVAL_MS,
  });
  const { data: maintenanceData } = useQuery({
    queryKey: queryKeys.maintenance.list(),
    queryFn: () => fetchJson<{ maintenances: TrackedMaintenanceSummary[] }>("/api/maintenance", { cache: "no-store" }),
    refetchInterval: POLL_INTERVAL_MS,
  });
  const { data: countsData } = useQuery({
    queryKey: queryKeys.history.counts(),
    queryFn: () => fetchJson<{ counts: IncidentCountByService[] }>("/api/history/counts", { cache: "no-store" }),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const onBoardEntries = catalog.filter((entry) => board.Slugs.includes(entry.slug));

  const overviewCounts = { critical: 0, major: 0, minor: 0, none: 0 };
  if (data) {
    for (const entry of onBoardEntries) {
      const status = data[entry.slug];
      if (!status || !("status" in status)) continue;
      const indicator = status.status.indicator;
      if (indicator === "critical" || indicator === "major" || indicator === "minor" || indicator === "none") {
        overviewCounts[indicator]++;
      }
    }
  }

  const boardSlugs = new Set(board.Slugs);
  const boardIncidents = (incidentsData?.incidents ?? []).filter((incident) => boardSlugs.has(incident.service.slug));
  const boardMaintenances = (maintenanceData?.maintenances ?? []).filter((maintenance) => boardSlugs.has(maintenance.service.slug));
  const activeIncidents = boardIncidents.filter(isActiveIncident);

  const deleteBoardMutation = useMutation({
    mutationFn: () => fetch(`/api/boards/${board.id}`, { method: "DELETE" }),
    onSuccess: (res) => {
      if (!res.ok) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.list() });
      router.push("/boards");
      // Otherwise /boards can serve a router-cached render still showing the deleted board.
      router.refresh();
    },
  });

  const cloneBoardMutation = useMutation({
    mutationFn: () =>
      postJson<Board>(`/api/boards/${board.id}/clone`, { name: t("boards.cloneName", { name: board.name }) }, t("boards.cloneFailed")),
    onSuccess: (clonedBoard) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.list() });
      router.push(`/boards/${clonedBoard.id}`);
    },
  });

  return (
    <div className="w-full self-start">
      <PageHeader
        back={
          <Link href="/boards" className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium">
            {t("serviceDetail.back")}
          </Link>
        }
      >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {rename.isEditing ? (
            <>
              <input
                type="text"
                value={rename.nameDraft}
                onChange={(e) => rename.setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") rename.submit();
                  if (e.key === "Escape") rename.cancel();
                }}
                placeholder={t("boards.namePlaceholder")}
                className="input input-bordered input-sm"
                autoFocus
              />
              <button type="button" disabled={rename.renaming} onClick={rename.submit} className="btn btn-info btn-sm">
                {t("boards.rename")}
              </button>
              <button type="button" onClick={rename.cancel} className="btn btn-square btn-sm" aria-label={t("boards.clearName")}>
                ×
              </button>
            </>
          ) : (
            <>
              <h1 className="text-base-content text-lg font-semibold">{board.name}</h1>
              <button
                type="button"
                onClick={rename.startEditing}
                aria-label={t("boards.rename")}
                title={t("boards.rename")}
                className="text-base-content/40 hover:text-base-content transition-transform hover:scale-110 active:scale-90"
              >
                <PencilIcon />
              </button>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            disabled={cloneBoardMutation.isPending}
            onClick={() => cloneBoardMutation.mutate()}
            className="btn btn-ghost btn-sm"
          >
            {cloneBoardMutation.isPending ? t("boards.cloning") : t("boards.clone")}
          </button>
          <button
            type="button"
            disabled={deleteBoardMutation.isPending || boardCount <= 1}
            onClick={() => confirmRef.current?.showModal()}
            className="btn btn-error btn-outline btn-sm"
          >
            {deleteBoardMutation.isPending ? t("boards.deleting") : t("boards.delete")}
          </button>
          {boardCount <= 1 && (
            <div className="tooltip tooltip-left" data-tip={t("boards.deleteLastBoard")}>
              <InfoIcon className="text-base-content/50" />
            </div>
          )}
        </div>
      </div>

      <dialog ref={confirmRef} className="modal">
        <div className="modal-box relative">
          <ModalCloseButton />
          <h3 className="text-lg font-bold">{t("boards.deleteConfirmTitle")}</h3>
          <p className="text-base-content/70 mt-2 text-sm">{t("boards.deleteConfirmMessage", { name: board.name })}</p>
          <div className="modal-action">
            <form method="dialog" className="flex gap-2">
              <button type="submit" className="btn btn-sm">
                {t("boards.cancel")}
              </button>
              <button
                type="button"
                disabled={deleteBoardMutation.isPending}
                onClick={() => deleteBoardMutation.mutate()}
                className="btn btn-error btn-sm"
              >
                {deleteBoardMutation.isPending ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Spinner size="xs" />
                    {t("boards.deleting")}
                  </span>
                ) : (
                  t("boards.delete")
                )}
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>{t("boards.cancel")}</button>
        </form>
      </dialog>

      {onBoardEntries.length > 0 ? (
        <>
          <StatusSummary counts={overviewCounts} isLoading={!data && !fetchFailed} />
          <div className="mt-2 flex justify-end">
            <Link
              href={`/history?board=${board.id}`}
              className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium"
            >
              {t("boards.viewHistory")}
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="card card-border bg-base-200 h-88 overflow-y-auto p-4">
              <BoardTrackedServicesGrid
                entries={onBoardEntries}
                data={data}
                fetchFailed={fetchFailed}
                onAddService={() => addServiceRef.current?.showModal()}
              />
            </div>
            <div className="card card-border bg-base-200 h-88 overflow-y-auto p-4">
              <BoardActiveIncidentsPanel boardId={board.id} activeIncidents={activeIncidents} />
            </div>
            <div className="card card-border bg-base-200 h-88 overflow-y-auto p-4">
              <BoardStatusPageSummary boardId={board.id} />
            </div>
            <div className="card card-border bg-base-200 h-88 overflow-y-auto p-4">
              <h2 className="text-base-content/40 text-xs font-semibold tracking-wide uppercase">{t("history.byServiceTab")}</h2>
              <div className="mt-3">
                <IncidentCountsChart
                  services={onBoardEntries}
                  counts={countsData?.counts ?? []}
                  selectedSlug=""
                  onSelectService={(slug) => router.push(`/history?board=${board.id}&service=${slug}`)}
                />
              </div>
            </div>
            <div className="card card-border bg-base-200 h-88 overflow-y-auto p-4">
              <BoardActiveMaintenancePanel boardId={board.id} maintenances={boardMaintenances} timeZone={timeZone} />
            </div>
          </div>
        </>
      ) : (
        <div className="mt-6">
          <NoServicesMessage board={board} onAddClick={() => addServiceRef.current?.showModal()} />
          <BoardSuggestedServices board={board} catalog={catalog} onAdded={handleServiceAdded} />
        </div>
      )}

      <AddServiceModal dialogRef={addServiceRef} boards={[board]} catalog={catalog} onAdded={handleServiceAdded} />
      </PageHeader>
    </div>
  );
}
