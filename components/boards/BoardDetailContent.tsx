"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { Catalog, ServiceStatusBatchResponse, TrackedIncidentSummary, TrackedMaintenanceSummary } from "@/types/service";
import type { IncidentCountByService } from "@/lib/getStoredIncident";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { useBoardRename } from "@/hooks/useBoardRename";
import { useTimeZone } from "@/hooks/useTimeZone";
import { isActiveIncident } from "@/lib/isActiveIncident";
import StatusSummary from "@/components/service/StatusSummary";
import BoardActiveIncidentsPanel from "@/components/boards/BoardActiveIncidentsPanel";
import BoardActiveMaintenancePanel from "@/components/boards/BoardActiveMaintenancePanel";
import BoardTrackedServicesGrid from "@/components/boards/BoardTrackedServicesGrid";
import BoardStatusPageSummary from "@/components/boards/BoardStatusPageSummary";
import IncidentCountsChart from "@/components/history/IncidentCountsChart";
import Spinner from "@/components/Spinner";
import { InfoIcon, PencilIcon } from "@/components/icons/NavIcons";

const POLL_INTERVAL_MS = 60_000;

export default function BoardDetailContent({
  board,
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
  const { data, isError: fetchFailed } = useQuery({
    queryKey: queryKeys.catalogStatus(),
    queryFn: () => fetchJson<ServiceStatusBatchResponse>("/api/status/catalog", { cache: "no-store" }),
    refetchInterval: POLL_INTERVAL_MS,
  });
  const rename = useBoardRename(board);
  const timeZone = useTimeZone();
  const confirmRef = useRef<HTMLDialogElement>(null);

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
      // Otherwise the destination /boards list can serve a router-cached
      // render from before this delete (still showing the deleted board,
      // or a stale count anywhere else on that page that depends on it).
      router.refresh();
    },
  });

  return (
    <div className="w-full self-start">
      <Link href="/boards" className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium">
        {t("serviceDetail.back")}
      </Link>

      <div className="mt-2 flex items-center justify-between gap-2">
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
            disabled={deleteBoardMutation.isPending || boardCount <= 1}
            onClick={() => confirmRef.current?.showModal()}
            className="btn btn-ghost btn-sm text-error"
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
        <div className="modal-box">
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
              <BoardTrackedServicesGrid boardId={board.id} entries={onBoardEntries} data={data} fetchFailed={fetchFailed} />
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
        <div className="mt-6 card card-border bg-base-200 p-4">
          <BoardTrackedServicesGrid boardId={board.id} entries={onBoardEntries} data={data} fetchFailed={fetchFailed} />
        </div>
      )}
    </div>
  );
}
