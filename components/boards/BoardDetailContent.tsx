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
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { useBoardRename } from "@/hooks/useBoardRename";
import { useTimeZone } from "@/hooks/useTimeZone";
import { isActiveIncident } from "@/lib/isActiveIncident";
import CatalogServiceGrid from "@/components/service/CatalogServiceGrid";
import StatusSummary from "@/components/service/StatusSummary";
import BoardActivityPanel from "@/components/boards/BoardActivityPanel";
import BoardLastIncidentTable from "@/components/boards/BoardLastIncidentTable";
import IncidentCountsChart from "@/components/history/IncidentCountsChart";
import Spinner from "@/components/Spinner";
import { InfoIcon, PencilIcon, PlusIcon } from "@/components/icons/NavIcons";

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
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);
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

  const activeSlugs = new Set(activeIncidents.map((incident) => incident.service.slug));
  const calmEntries = onBoardEntries
    .filter((entry) => !activeSlugs.has(entry.slug))
    .map((entry) => ({
      service: entry,
      lastIncident: boardIncidents.find((incident) => incident.service.slug === entry.slug) ?? null,
    }));

  const removeFromBoardMutation = useMutation({
    mutationFn: (entry: Catalog) => fetch(`/api/boards/${board.id}/services/${entry.slug}`, { method: "DELETE" }),
    onSettled: () => setRemovingSlug(null),
    onSuccess: (res) => {
      if (res.ok) router.refresh();
    },
  });

  function handleRemove(entry: Catalog) {
    setRemovingSlug(entry.slug);
    removeFromBoardMutation.mutate(entry);
  }

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

      {onBoardEntries.length > 0 && (
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
          <BoardActivityPanel boardId={board.id} activeIncidents={activeIncidents} maintenances={boardMaintenances} timeZone={timeZone} />
          <div className="mt-6">
            <IncidentCountsChart
              services={onBoardEntries}
              counts={countsData?.counts ?? []}
              selectedSlug=""
              onSelectService={(slug) => router.push(`/history?board=${board.id}&service=${slug}`)}
            />
          </div>
          <BoardLastIncidentTable entries={calmEntries} timeZone={timeZone} />
        </>
      )}

      <div className="mt-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base-content/40 text-xs font-semibold tracking-wide uppercase">{t("boards.onBoard")}</h2>
          <Link href={`/add-service?board=${board.id}`} className="btn btn-info btn-sm">
            <PlusIcon />
            {t("nav.addService")}
          </Link>
        </div>

        <div className="mt-3">
          {onBoardEntries.length === 0 ? (
            <p className="text-base-content/50 text-sm">{t("boards.noServicesOnBoard")}</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),370px))] gap-3">
              <CatalogServiceGrid
                catalog={onBoardEntries}
                trackedHosts={[]}
                data={data}
                fetchFailed={fetchFailed}
                removingSlug={removingSlug}
                onRemove={handleRemove}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
