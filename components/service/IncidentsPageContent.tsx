"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDateTime, formatDuration, minutesBetween, msSince, epochMs } from "@/lib/formatTime";
import type { Board } from "@/types/board";
import type { TrackedIncident, TrackedIncidentSummary } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE, ALL_IMPACTS } from "@/components/service/statusStyles";
import Spinner from "@/components/Spinner";
import ImpactFilterDropdown from "@/components/service/ImpactFilterDropdown";
import PinButton from "@/components/service/PinButton";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { usePinned } from "@/hooks/usePinned";
import { useIncidentsLastViewed } from "@/hooks/useIncidentsLastViewed";
import { useTimeZone } from "@/hooks/useTimeZone";
import { useDebouncedUrlFilters } from "@/hooks/useDebouncedUrlFilters";
import { mergeParams } from "@/lib/mergeParams";
import { useSelectAndScrollOnMobile } from "@/hooks/useSelectAndScrollOnMobile";
import { useAutoSelectFirstId } from "@/hooks/useAutoSelectFirstId";
import { useSelectedBoard } from "@/hooks/useSelectedBoard";
import { parseImpacts, serializeImpacts } from "@/lib/impactsParam";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "@/components/Pagination";
import IncidentDetail from "@/components/service/IncidentDetail";
import ListDetailShell from "@/components/service/ListDetailShell";
import SearchFilterInput from "@/components/service/SearchFilterInput";
import ClearFiltersButton from "@/components/service/ClearFiltersButton";

type StatusFilter = "all" | "investigating" | "identified" | "monitoring" | "resolved" | "postmortem";
type TimeRange = "all" | "24h" | "7d" | "30d";
type DebouncedGroup = { status: StatusFilter; q: string; range: TimeRange; impacts: Set<string>; board: string };

const RANGE_MS: Record<Exclude<TimeRange, "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const PAGE_SIZE = 7;
const DEBOUNCE_MS = 300;
const POLL_INTERVAL_MS = 60_000;
const ALL_STATUSES: StatusFilter[] = ["all", "investigating", "identified", "monitoring", "resolved", "postmortem"];
const STATUS_LABEL_KEY: Record<StatusFilter, string> = {
  all: "allStatuses",
  investigating: "investigating",
  identified: "identified",
  monitoring: "monitoring",
  resolved: "resolved",
  postmortem: "postmortem",
};

function matchesStatus(incident: TrackedIncidentSummary, filter: StatusFilter): boolean {
  return filter === "all" || incident.status === filter;
}

function parseGroupFromSearchParams(searchParams: URLSearchParams): DebouncedGroup {
  return {
    status: (searchParams.get("status") as StatusFilter | null) ?? "all",
    q: searchParams.get("q") ?? "",
    range: (searchParams.get("range") as TimeRange | null) ?? "30d",
    impacts: parseImpacts(searchParams, ALL_IMPACTS),
    board: searchParams.get("board") ?? "",
  };
}

// Content fingerprint of the debounced group, used to tell "we just wrote
// this ourselves" apart from "the URL genuinely changed" (back/forward, a
// pasted link) — see the two sync effects below.
function serializeGroup(g: DebouncedGroup): string {
  return JSON.stringify([g.status, g.q, g.range, [...g.impacts].sort().join(","), g.board]);
}

// Every field omits itself from the URL at its default value, for a clean
// URL when nothing's actually filtered — impacts already worked this way;
// status/range now match it instead of always being written explicitly.
function debouncedGroupPatch(g: DebouncedGroup): Record<string, string | null> {
  return {
    status: g.status === "all" ? null : g.status,
    q: g.q.trim() === "" ? null : g.q.trim(),
    range: g.range === "30d" ? null : g.range,
    impacts: serializeImpacts(g.impacts, ALL_IMPACTS),
    board: g.board === "" ? null : g.board,
    page: null,
  };
}

export default function IncidentsPageContent({ boards }: { boards: Board[] }) {
  const { t } = useTranslation();
  const { data, isError: error } = useQuery({
    queryKey: queryKeys.incidents.list(),
    queryFn: () => fetchJson<{ incidents: TrackedIncidentSummary[] }>("/api/incidents", { cache: "no-store" }),
    refetchInterval: POLL_INTERVAL_MS,
  });
  const { pinned, togglePin } = usePinned("pinnedIncidents");
  const lastViewed = useIncidentsLastViewed(true);
  const timeZone = useTimeZone();

  const { pendingFilters, setPendingFilters, updateParams, searchParams, router } = useDebouncedUrlFilters({
    path: "/incidents",
    parse: parseGroupFromSearchParams,
    serialize: serializeGroup,
    toPatch: debouncedGroupPatch,
    debounceMs: DEBOUNCE_MS,
  });

  const detailRef = useRef<HTMLDivElement>(null);
  const selectIncident = useSelectAndScrollOnMobile("/incidents", detailRef);

  const { selectedBoardId } = useSelectedBoard();
  // True on a render where the persisted cross-page board pick (see
  // hooks/useSelectedBoard) is about to be applied because this URL has no
  // ?board= of its own yet — filteredIncidents below is still unfiltered on
  // that render, so useAutoSelectFirstId is told to sit it out (see its call
  // below) rather than risk auto-selecting an incident outside the board
  // that's about to be applied.
  const persistedBoardApplies = !searchParams.has("board") && !!selectedBoardId && boards.some((b) => b.id === selectedBoardId);

  useEffect(() => {
    if (persistedBoardApplies) {
      router.replace(`/incidents?${mergeParams(searchParams, { board: selectedBoardId }).toString()}`, { scroll: false });
    }
  }, [persistedBoardApplies, selectedBoardId, searchParams, router]);

  const isLoading = !data && !error;
  const incidents = useMemo(() => data?.incidents ?? [], [data]);
  const selectedId = searchParams.get("id");
  const page = Number(searchParams.get("page") ?? "1");
  const selectedIncident = incidents.find((incident) => incident.id === selectedId);
  const selectedSlug = selectedIncident?.service.slug;

  // Full timeline for whichever incident is selected, fetched separately —
  // the list response deliberately omits incident_updates (see
  // app/api/incidents/route.ts). One-shot per selection, not polled: an
  // already-open incident's timeline won't live-update, only refreshes on
  // reselection. The list itself keeps polling every 60s regardless.
  const { data: detail, isError: detailError } = useQuery({
    queryKey: queryKeys.incidents.detail(selectedSlug ?? "", selectedId ?? ""),
    queryFn: () => fetchJson<TrackedIncident>(`/api/incidents/${selectedSlug}/${selectedId}`),
    enabled: !!selectedSlug && !!selectedId,
  });

  const trimmedServiceQuery = pendingFilters.q.trim().toLowerCase();
  const selectedBoard = boards.find((board) => board.id === pendingFilters.board);
  const boardSlugs = useMemo(() => (selectedBoard ? new Set(selectedBoard.Slugs) : null), [selectedBoard]);
  const filteredIncidents = useMemo(
    () =>
      incidents
        .filter(
          (incident) =>
            matchesStatus(incident, pendingFilters.status) &&
            pendingFilters.impacts.has(incident.impact) &&
            (!trimmedServiceQuery || incident.service.name.toLowerCase().includes(trimmedServiceQuery)) &&
            (pendingFilters.range === "all" || msSince(incident.updated_at) <= RANGE_MS[pendingFilters.range]) &&
            (!boardSlugs || boardSlugs.has(incident.service.slug)),
        )
        .sort((a, b) => {
          const pinnedDiff = Number(pinned.has(b.id)) - Number(pinned.has(a.id));
          if (pinnedDiff !== 0) return pinnedDiff;
          return Number(epochMs(b.updated_at) > lastViewed) - Number(epochMs(a.updated_at) > lastViewed);
        }),
    [incidents, pendingFilters, trimmedServiceQuery, pinned, boardSlugs, lastViewed],
  );

  useAutoSelectFirstId("/incidents", selectedId, persistedBoardApplies ? [] : filteredIncidents);

  function toggleImpact(impact: string) {
    setPendingFilters((prev) => {
      const next = new Set(prev.impacts);
      if (next.has(impact)) next.delete(impact);
      else next.add(impact);
      return { ...prev, impacts: next };
    });
  }

  const hasActiveFilters =
    pendingFilters.status !== "all" ||
    pendingFilters.q.trim() !== "" ||
    pendingFilters.range !== "30d" ||
    pendingFilters.impacts.size !== ALL_IMPACTS.length;

  function clearFilters() {
    // board isn't reset here — it's no longer a filter this page can set
    // (see BoardSelect.tsx), just whatever the sidebar has selected.
    setPendingFilters((prev) => ({ ...prev, status: "all", q: "", range: "30d", impacts: new Set(ALL_IMPACTS) }));
    updateParams({ page: null });
  }

  const countForStatus = (filter: StatusFilter) => incidents.filter((incident) => matchesStatus(incident, filter)).length;
  const { listRef, minListHeight, totalPages, currentPage, pageItems: pageIncidents } = usePagination(
    filteredIncidents,
    page,
    PAGE_SIZE,
  );

  function goToPage(next: number) {
    updateParams({ page: next === 1 ? null : String(next) });
  }

  const filters = (
    <form className="flex flex-wrap items-center gap-2">
      <SearchFilterInput
        value={pendingFilters.q}
        onChange={(q) => setPendingFilters((prev) => ({ ...prev, q }))}
        label={t("incidents.filter.searchService")}
      />
      <select
        className="select select-bordered select-sm w-40"
        aria-label={t("incidents.filter.timeRange")}
        value={pendingFilters.range}
        onChange={(e) => setPendingFilters((prev) => ({ ...prev, range: e.target.value as TimeRange }))}
      >
        <option value="all">{t("incidents.filter.allTime")}</option>
        <option value="24h">{t("incidents.filter.last24h")}</option>
        <option value="7d">{t("incidents.filter.last7d")}</option>
        <option value="30d">{t("incidents.filter.last30d")}</option>
      </select>
      <select
        className="select select-bordered select-sm w-40"
        aria-label={t("incidents.filter.status")}
        value={pendingFilters.status}
        onChange={(e) => setPendingFilters((prev) => ({ ...prev, status: e.target.value as StatusFilter }))}
      >
        {ALL_STATUSES.filter(
          (status) => status === "all" || countForStatus(status) > 0 || status === pendingFilters.status,
        ).map((status) => (
          <option key={status} value={status}>
            {t(`incidents.filter.${STATUS_LABEL_KEY[status]}`)} ({countForStatus(status)})
          </option>
        ))}
      </select>
      <ImpactFilterDropdown selected={pendingFilters.impacts} onToggle={toggleImpact} />
      {hasActiveFilters && <ClearFiltersButton label={t("incidents.filter.clearFilters")} onClick={clearFilters} />}
    </form>
  );

  const list = (
    <>
      {filteredIncidents.length === 0 ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("incidents.filter.noMatches")}</p>
      ) : (
        <ul
          ref={listRef}
          style={{ minHeight: totalPages > 1 ? minListHeight : undefined }}
          className="mt-4 flex flex-col gap-3"
        >
          {pageIncidents.map((incident) => {
            const Logo = SERVICE_LOGOS[incident.service.slug] ?? FallbackLogo;
            const style = INDICATOR_STYLES[incident.impact] ?? FALLBACK_STYLE;
            const isNew = epochMs(incident.updated_at) > lastViewed;
            const isSelected = incident.id === selectedId;
            return (
              <li
                key={incident.id}
                className={`card card-border bg-base-200 relative flex w-full flex-row items-stretch overflow-hidden shadow-md transition-colors ${
                  isSelected ? "border-primary" : "hover:border-base-content/20"
                }`}
              >
                <div className="absolute top-3 right-4 z-10 flex items-center gap-2">
                  <PinButton
                    pinned={pinned.has(incident.id)}
                    onToggle={() => togglePin(incident.id)}
                    ariaLabel={t(pinned.has(incident.id) ? "incidents.unpin" : "incidents.pin")}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => selectIncident(incident.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 p-4 text-left"
                >
                  <Logo size={24} name={incident.service.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-base-content/50 text-xs">{incident.service.name}</p>
                    <p className="text-base-content truncate text-sm font-medium">{incident.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-base-content/50 text-xs">{incident.status}</span>
                      <span className={`badge badge-xs ${style.badge} text-white`}>{t(style.labelKey)}</span>
                      {isNew && (
                        <span className="badge badge-xs badge-info text-white uppercase">{t("incidents.new")}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-base-content/50 self-end text-right text-xs whitespace-nowrap">
                    <p>{formatDateTime(incident.updated_at, timeZone)}</p>
                    {incident.resolved_at && (
                      <p>
                        {t("history.resolutionTime", {
                          duration: formatDuration(minutesBetween(incident.created_at, incident.resolved_at), t),
                        })}
                      </p>
                    )}
                  </div>
                </button>
                <div className={`w-3 shrink-0 self-stretch ${style.dot}`} aria-hidden="true" />
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onChange={goToPage}
        label={t("incidents.pagination.label")}
        prevLabel={t("incidents.pagination.previous")}
        nextLabel={t("incidents.pagination.next")}
      />
    </>
  );

  const detailContent = detail ? (
    <IncidentDetail incident={detail} timeZone={timeZone} lastViewed={lastViewed} />
  ) : detailError ? (
    <p className="text-base-content/50 text-sm">{t("incidents.unreachable")}</p>
  ) : selectedIncident ? (
    <p className="text-base-content/50 flex h-full items-center justify-center gap-2 text-sm">
      <Spinner size="xl" />
      {t("incidents.loading")}
    </p>
  ) : (
    <p className="text-base-content/50 text-sm">{t("incidents.selectPrompt")}</p>
  );

  return (
    <ListDetailShell
      title={t("incidents.title")}
      subtitle={t("incidents.subtitle")}
      isLoading={isLoading}
      isError={!!error}
      isEmpty={incidents.length === 0}
      loadingLabel={t("incidents.loading")}
      unreachableLabel={t("incidents.unreachable")}
      emptyLabel={t("serviceDetail.noIncidents")}
      filters={filters}
      list={list}
      detailRef={detailRef}
      detail={detailContent}
    />
  );
}
