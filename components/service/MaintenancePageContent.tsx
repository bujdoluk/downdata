"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDateTime } from "@/lib/formatTime";
import type { Board } from "@/types/board";
import type { TrackedMaintenance, TrackedMaintenanceSummary } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import Spinner from "@/components/Spinner";
import BoardFilterSelect from "@/components/service/BoardFilterSelect";
import PinButton from "@/components/service/PinButton";
import { usePolledFetch } from "@/lib/usePolledFetch";
import { usePinned } from "@/lib/usePinned";
import { useDebouncedUrlFilters } from "@/lib/useDebouncedUrlFilters";
import { useSelectAndScrollOnMobile } from "@/lib/useSelectAndScrollOnMobile";
import { useAutoSelectFirstId } from "@/lib/useAutoSelectFirstId";
import { usePagination } from "@/lib/usePagination";
import Pagination from "@/components/Pagination";
import { isInProgressMaintenance } from "@/lib/isInProgressMaintenance";
import IncidentDetail from "@/components/service/IncidentDetail";

type StatusFilter = "all" | "scheduled" | "in_progress";
type DebouncedGroup = { status: StatusFilter; q: string; board: string };

const PAGE_SIZE = 7;
const DEBOUNCE_MS = 300;

function matchesStatus(maintenance: TrackedMaintenanceSummary, filter: StatusFilter): boolean {
  return filter === "all" || maintenance.status === filter;
}

function parseGroupFromSearchParams(searchParams: URLSearchParams): DebouncedGroup {
  return {
    status: (searchParams.get("status") as StatusFilter | null) ?? "all",
    q: searchParams.get("q") ?? "",
    board: searchParams.get("board") ?? "",
  };
}

// Content fingerprint of the debounced group, used to tell "we just wrote
// this ourselves" apart from "the URL genuinely changed" (back/forward, a
// pasted link) — see the two sync effects below.
function serializeGroup(g: DebouncedGroup): string {
  return JSON.stringify([g.status, g.q, g.board]);
}

// Every field omits itself from the URL at its default value, for a clean
// URL when nothing's actually filtered. Always resets pagination — a
// settled filter change invalidates whatever page the user was on.
function debouncedGroupPatch(g: DebouncedGroup): Record<string, string | null> {
  return {
    status: g.status === "all" ? null : g.status,
    q: g.q.trim() === "" ? null : g.q.trim(),
    board: g.board === "" ? null : g.board,
    page: null,
  };
}

export default function MaintenancePageContent({ boards }: { boards: Board[] }) {
  const { t } = useTranslation();
  const { data, error } = usePolledFetch<{ maintenances: TrackedMaintenanceSummary[] }>("/api/maintenance");
  const { pinned, togglePin } = usePinned("pinnedMaintenance");

  const { pendingFilters, setPendingFilters, updateParams, searchParams } = useDebouncedUrlFilters({
    path: "/maintenance",
    parse: parseGroupFromSearchParams,
    serialize: serializeGroup,
    toPatch: debouncedGroupPatch,
    debounceMs: DEBOUNCE_MS,
  });

  const [result, setResult] = useState<{ id: string; maintenance: TrackedMaintenance } | { id: string; error: true } | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const selectMaintenance = useSelectAndScrollOnMobile("/maintenance", detailRef);

  const isLoading = !data && !error;
  const maintenances = useMemo(() => data?.maintenances ?? [], [data]);
  const selectedId = searchParams.get("id");
  const page = Number(searchParams.get("page") ?? "1");
  const selectedMaintenance = maintenances.find((maintenance) => maintenance.id === selectedId);
  const selectedSlug = selectedMaintenance?.service.slug;

  // Full timeline for whichever maintenance is selected, fetched
  // separately — see IncidentsPageContent's identical detail-fetch effect
  // for the full reasoning.
  useEffect(() => {
    if (!selectedSlug || !selectedId) return;
    let cancelled = false;
    fetch(`/api/maintenance/${selectedSlug}/${selectedId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
      .then((maintenance) => {
        if (!cancelled) setResult({ id: selectedId, maintenance });
      })
      .catch(() => {
        if (!cancelled) setResult({ id: selectedId, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSlug, selectedId]);

  const currentResult = result?.id === selectedId ? result : null;
  const detail = currentResult && "maintenance" in currentResult ? currentResult.maintenance : null;
  const detailError = currentResult ? "error" in currentResult : false;

  const trimmedServiceQuery = pendingFilters.q.trim().toLowerCase();
  const selectedBoard = boards.find((board) => board.id === pendingFilters.board);
  const boardSlugs = useMemo(() => (selectedBoard ? new Set(selectedBoard.Slugs) : null), [selectedBoard]);
  const filteredMaintenances = useMemo(
    () =>
      maintenances
        .filter(
          (maintenance) =>
            matchesStatus(maintenance, pendingFilters.status) &&
            (!trimmedServiceQuery || maintenance.service.name.toLowerCase().includes(trimmedServiceQuery)) &&
            (!boardSlugs || boardSlugs.has(maintenance.service.slug)),
        )
        .sort((a, b) => {
          const pinDiff = Number(pinned.has(b.id)) - Number(pinned.has(a.id));
          if (pinDiff !== 0) return pinDiff;
          return Number(isInProgressMaintenance(b)) - Number(isInProgressMaintenance(a));
        }),
    [maintenances, pendingFilters, trimmedServiceQuery, pinned, boardSlugs],
  );

  useAutoSelectFirstId("/maintenance", selectedId, filteredMaintenances);

  const hasActiveFilters = pendingFilters.status !== "all" || pendingFilters.q.trim() !== "" || pendingFilters.board !== "";

  function clearFilters() {
    setPendingFilters({ status: "all", q: "", board: "" });
    updateParams({ page: null });
  }

  const countForStatus = (filter: StatusFilter) =>
    maintenances.filter((maintenance) => matchesStatus(maintenance, filter)).length;
  const showScheduled = countForStatus("scheduled") > 0 || pendingFilters.status === "scheduled";
  const showInProgress = countForStatus("in_progress") > 0 || pendingFilters.status === "in_progress";
  const { listRef, minListHeight, totalPages, currentPage, pageItems: pageMaintenances } = usePagination(
    filteredMaintenances,
    page,
    PAGE_SIZE,
  );

  function goToPage(next: number) {
    updateParams({ page: next === 1 ? null : String(next) });
  }

  return (
    <div className="w-full self-start">
      <h1 className="text-xl font-semibold text-base-content">{t("maintenances.title")}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{t("maintenances.subtitle")}</p>

      {isLoading ? (
        <p className="text-base-content/50 mt-4 flex items-center gap-2 text-sm">
          <Spinner size="sm" />
          {t("maintenances.loading")}
        </p>
      ) : error ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("maintenances.unreachable")}</p>
      ) : maintenances.length === 0 ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("maintenances.empty")}</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <form className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                className="input input-bordered input-sm w-40"
                aria-label={t("incidents.filter.searchService")}
                placeholder={t("incidents.filter.searchService")}
                value={pendingFilters.q}
                onChange={(e) => setPendingFilters((prev) => ({ ...prev, q: e.target.value }))}
              />
              <select
                className="select select-bordered select-sm w-40"
                aria-label={t("maintenances.filter.status")}
                value={pendingFilters.status}
                onChange={(e) => setPendingFilters((prev) => ({ ...prev, status: e.target.value as StatusFilter }))}
              >
                <option value="all">
                  {t("maintenances.filter.allStatuses")} ({countForStatus("all")})
                </option>
                {showScheduled && (
                  <option value="scheduled">
                    {t("maintenances.filter.scheduled")} ({countForStatus("scheduled")})
                  </option>
                )}
                {showInProgress && (
                  <option value="in_progress">
                    {t("maintenances.inProgress")} ({countForStatus("in_progress")})
                  </option>
                )}
              </select>
              <BoardFilterSelect
                boards={boards}
                value={pendingFilters.board}
                onChange={(board) => setPendingFilters((prev) => ({ ...prev, board }))}
              />
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className="btn btn-ghost btn-xs">
                  {t("incidents.filter.clearFilters")}
                </button>
              )}
            </form>

            {filteredMaintenances.length === 0 ? (
              <p className="text-base-content/50 mt-4 text-sm">{t("maintenances.noMatches")}</p>
            ) : (
              <ul
                ref={listRef}
                style={{ minHeight: totalPages > 1 ? minListHeight : undefined }}
                className="mt-4 flex flex-col gap-3"
              >
                {pageMaintenances.map((maintenance) => {
                  const Logo = SERVICE_LOGOS[maintenance.service.slug] ?? FallbackLogo;
                  const isActive = isInProgressMaintenance(maintenance);
                  const isSelected = maintenance.id === selectedId;
                  return (
                    <li key={maintenance.id} className="relative">
                      <button
                        type="button"
                        onClick={() => selectMaintenance(maintenance.id)}
                        className={`card card-border bg-base-200 relative flex w-full flex-row items-center gap-3 overflow-hidden p-4 text-left shadow-md transition-colors ${
                          isSelected ? "border-primary" : isActive ? "border-info" : "hover:border-base-content/20"
                        }`}
                      >
                        <Logo size={24} name={maintenance.service.name} />
                        <div className="min-w-0 flex-1">
                          <p className="text-base-content/50 text-xs">{maintenance.service.name}</p>
                          <p className="text-base-content truncate text-sm font-medium">{maintenance.name}</p>
                          {isActive ? (
                            <span className="badge badge-info badge-xs mt-1 gap-1.5">
                              <span className="bg-info-content text-info-content animate-pulse-ring h-1.5 w-1.5 rounded-full" />
                              {t("maintenances.inProgress")}
                            </span>
                          ) : (
                            <p className="text-base-content/50 text-xs">{maintenance.status}</p>
                          )}
                        </div>
                        <p className="text-base-content/50 self-end text-xs whitespace-nowrap">
                          {formatDateTime(maintenance.scheduled_for)} – {formatDateTime(maintenance.scheduled_until)}
                        </p>
                      </button>
                      <PinButton
                        pinned={pinned.has(maintenance.id)}
                        onToggle={() => togglePin(maintenance.id)}
                        ariaLabel={t(pinned.has(maintenance.id) ? "maintenances.unpin" : "maintenances.pin")}
                        className="absolute top-3 right-3 z-10"
                      />
                    </li>
                  );
                })}
              </ul>
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onChange={goToPage}
              prevLabel={t("maintenances.pagination.previous")}
              nextLabel={t("maintenances.pagination.next")}
              pageLabel={t("maintenances.pagination.page", { page: currentPage, totalPages })}
            />
          </div>

          <div ref={detailRef} className="card card-border bg-base-200 p-4">
            {detail ? (
              <IncidentDetail incident={detail} />
            ) : detailError ? (
              <p className="text-base-content/50 text-sm">{t("maintenances.unreachable")}</p>
            ) : selectedMaintenance ? (
              <p className="text-base-content/50 flex items-center gap-2 text-sm">
                <Spinner size="sm" />
                {t("maintenances.loading")}
              </p>
            ) : (
              <p className="text-base-content/50 text-sm">{t("maintenances.selectPrompt")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
