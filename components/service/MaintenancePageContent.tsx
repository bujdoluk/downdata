"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDateTime } from "@/lib/formatTime";
import type { Board } from "@/types/board";
import type { TrackedMaintenance, TrackedMaintenanceSummary } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { PinIcon } from "@/components/icons/NavIcons";
import Spinner from "@/components/Spinner";
import { usePolledFetch } from "@/lib/usePolledFetch";
import { usePinned } from "@/lib/usePinned";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { mergeParams } from "@/lib/mergeParams";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, error } = usePolledFetch<{ maintenances: TrackedMaintenanceSummary[] }>("/api/maintenance");
  const { pinned, togglePin } = usePinned("pinnedMaintenance");

  const [pendingFilters, setPendingFilters] = useState<DebouncedGroup>(() => parseGroupFromSearchParams(searchParams));
  const lastWrittenRef = useRef(serializeGroup(pendingFilters));
  const debounced = useDebouncedValue(pendingFilters, DEBOUNCE_MS);

  const [result, setResult] = useState<{ id: string; maintenance: TrackedMaintenance } | { id: string; error: true } | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const isLoading = !data && !error;
  const maintenances = useMemo(() => data?.maintenances ?? [], [data]);
  const selectedId = searchParams.get("id");
  const page = Number(searchParams.get("page") ?? "1");
  const selectedMaintenance = maintenances.find((maintenance) => maintenance.id === selectedId);
  const selectedServiceSlug = selectedMaintenance?.service.slug;

  // pendingFilters -> URL, only once it's settled for DEBOUNCE_MS.
  useEffect(() => {
    const serialized = serializeGroup(debounced);
    if (serialized === lastWrittenRef.current) return;
    lastWrittenRef.current = serialized;
    const next = mergeParams(searchParams, debouncedGroupPatch(debounced));
    router.replace(`/maintenance?${next.toString()}`, { scroll: false });
  }, [debounced, searchParams, router]);

  // URL -> pendingFilters, for changes we didn't just make ourselves
  // (back/forward button, a pasted link with filters already in it).
  useEffect(() => {
    const parsed = parseGroupFromSearchParams(searchParams);
    const serialized = serializeGroup(parsed);
    if (serialized === lastWrittenRef.current) return;
    lastWrittenRef.current = serialized;
    setPendingFilters(parsed);
  }, [searchParams]);

  // Full timeline for whichever maintenance is selected, fetched
  // separately — see IncidentsPageContent's identical detail-fetch effect
  // for the full reasoning.
  useEffect(() => {
    if (!selectedServiceSlug || !selectedId) return;
    let cancelled = false;
    fetch(`/api/maintenance/${selectedServiceSlug}/${selectedId}`)
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
  }, [selectedServiceSlug, selectedId]);

  const currentResult = result?.id === selectedId ? result : null;
  const detail = currentResult && "maintenance" in currentResult ? currentResult.maintenance : null;
  const detailError = currentResult ? "error" in currentResult : false;

  const trimmedServiceQuery = pendingFilters.q.trim().toLowerCase();
  const selectedBoard = boards.find((board) => board.id === pendingFilters.board);
  const boardSlugs = useMemo(() => (selectedBoard ? new Set(selectedBoard.serviceSlugs) : null), [selectedBoard]);
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

  // Auto-selects the first *visible* maintenance, and only ever touches
  // `id` — merged into the existing query string so a filter set from a
  // shared link survives landing on the page with nothing selected yet.
  useEffect(() => {
    if (!selectedId && filteredMaintenances.length > 0) {
      const next = mergeParams(searchParams, { id: filteredMaintenances[0]!.id });
      router.replace(`/maintenance?${next.toString()}`, { scroll: false });
    }
  }, [selectedId, filteredMaintenances, searchParams, router]);

  function selectMaintenance(id: string) {
    const next = mergeParams(searchParams, { id });
    router.push(`/maintenance?${next.toString()}`, { scroll: false });
    // Below the lg breakpoint the list and detail stack vertically — without
    // this, picking a maintenance near the top of the list leaves the
    // detail pane rendering off-screen with nothing to indicate it changed.
    if (window.innerWidth < 1024) {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function updateParams(patch: Record<string, string | null>) {
    router.replace(`/maintenance?${mergeParams(searchParams, patch).toString()}`, { scroll: false });
  }

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
              {boards.length > 0 && (
                <select
                  className="select select-bordered select-sm w-40"
                  aria-label={t("incidents.filter.board")}
                  value={pendingFilters.board}
                  onChange={(e) => setPendingFilters((prev) => ({ ...prev, board: e.target.value }))}
                >
                  <option value="">{t("incidents.filter.allBoards")}</option>
                  {boards.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))}
                </select>
              )}
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
                      <button
                        type="button"
                        onClick={() => togglePin(maintenance.id)}
                        aria-label={t(pinned.has(maintenance.id) ? "maintenances.unpin" : "maintenances.pin")}
                        className="text-base-content/40 hover:text-base-content absolute top-3 right-3 z-10 transition-transform hover:scale-110 active:scale-90"
                      >
                        <PinIcon className="h-4 w-4" filled={pinned.has(maintenance.id)} />
                      </button>
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
