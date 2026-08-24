"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDateTime, formatDuration, minutesBetween, msSince } from "@/lib/formatTime";
import type { TrackedIncident, TrackedIncidentSummary } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE, IMPACT_CHECKBOX_COLOR, ALL_IMPACTS } from "@/components/service/statusStyles";
import Spinner from "@/components/Spinner";
import { PinIcon } from "@/components/icons/NavIcons";
import { usePolledFetch } from "@/lib/usePolledFetch";
import { usePinned } from "@/lib/usePinned";
import { useIncidentsLastViewed } from "@/lib/useIncidentsLastViewed";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { mergeParams } from "@/lib/mergeParams";
import { usePagination } from "@/lib/usePagination";
import Pagination from "@/components/Pagination";
import IncidentDetail from "@/components/service/IncidentDetail";

type StatusFilter = "all" | "investigating" | "identified" | "monitoring" | "resolved" | "postmortem";
type TimeRange = "all" | "24h" | "7d" | "30d";
type DebouncedGroup = { status: StatusFilter; q: string; range: TimeRange; impacts: Set<string> };

const RANGE_MS: Record<Exclude<TimeRange, "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const PAGE_SIZE = 7;
const DEBOUNCE_MS = 300;
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

function parseImpacts(searchParams: URLSearchParams): Set<string> {
  const raw = searchParams.get("impacts");
  // Absent = default = everything. Present-but-empty ("impacts=") means the
  // user unchecked every box — must stay an empty set, not fall back to
  // "everything", or clearing every checkbox would silently show it all.
  if (raw === null) return new Set(ALL_IMPACTS);
  return new Set(raw.split(",").filter(Boolean));
}

function parseGroupFromSearchParams(searchParams: URLSearchParams): DebouncedGroup {
  return {
    status: (searchParams.get("status") as StatusFilter | null) ?? "all",
    q: searchParams.get("q") ?? "",
    range: (searchParams.get("range") as TimeRange | null) ?? "30d",
    impacts: parseImpacts(searchParams),
  };
}

// Content fingerprint of the debounced group, used to tell "we just wrote
// this ourselves" apart from "the URL genuinely changed" (back/forward, a
// pasted link) — see the two sync effects below.
function serializeGroup(g: DebouncedGroup): string {
  return JSON.stringify([g.status, g.q, g.range, [...g.impacts].sort().join(",")]);
}

// Every field omits itself from the URL at its default value, for a clean
// URL when nothing's actually filtered — impacts already worked this way;
// status/range now match it instead of always being written explicitly.
function debouncedGroupPatch(g: DebouncedGroup): Record<string, string | null> {
  return {
    status: g.status === "all" ? null : g.status,
    q: g.q.trim() === "" ? null : g.q.trim(),
    range: g.range === "30d" ? null : g.range,
    impacts: g.impacts.size === ALL_IMPACTS.length ? null : [...g.impacts].sort().join(","),
    page: null,
  };
}

export default function IncidentsPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, error } = usePolledFetch<{ incidents: TrackedIncidentSummary[] }>("/api/incidents");
  const { pinned, togglePin } = usePinned("pinnedIncidents");
  const lastViewed = useIncidentsLastViewed(true);

  const [pendingFilters, setPendingFilters] = useState<DebouncedGroup>(() => parseGroupFromSearchParams(searchParams));
  const lastWrittenRef = useRef(serializeGroup(pendingFilters));
  const debounced = useDebouncedValue(pendingFilters, DEBOUNCE_MS);

  const [result, setResult] = useState<{ id: string; incident: TrackedIncident } | { id: string; error: true } | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const isLoading = !data && !error;
  const incidents = useMemo(() => data?.incidents ?? [], [data]);
  const selectedId = searchParams.get("id");
  const page = Number(searchParams.get("page") ?? "1");
  const onlyNew = searchParams.get("new") === "1";
  const selectedIncident = incidents.find((incident) => incident.id === selectedId);
  const selectedServiceSlug = selectedIncident?.service.slug;

  // pendingFilters -> URL, only once it's settled for DEBOUNCE_MS.
  useEffect(() => {
    const serialized = serializeGroup(debounced);
    if (serialized === lastWrittenRef.current) return;
    lastWrittenRef.current = serialized;
    const next = mergeParams(searchParams, debouncedGroupPatch(debounced));
    router.replace(`/incidents?${next.toString()}`, { scroll: false });
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

  // Full timeline for whichever incident is selected, fetched separately —
  // the list response deliberately omits incident_updates (see
  // app/api/incidents/route.ts). One-shot per selection, not polled: an
  // already-open incident's timeline won't live-update, only refreshes on
  // reselection. The list itself keeps polling every 60s regardless.
  // id-tagged result compared against the current selection below (same
  // pattern HistoryPageContent uses) instead of resetting state up front.
  useEffect(() => {
    if (!selectedServiceSlug || !selectedId) return;
    let cancelled = false;
    fetch(`/api/incidents/${selectedServiceSlug}/${selectedId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
      .then((incident) => {
        if (!cancelled) setResult({ id: selectedId, incident });
      })
      .catch(() => {
        if (!cancelled) setResult({ id: selectedId, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedServiceSlug, selectedId]);

  const currentResult = result?.id === selectedId ? result : null;
  const detail = currentResult && "incident" in currentResult ? currentResult.incident : null;
  const detailError = currentResult ? "error" in currentResult : false;

  const trimmedServiceQuery = pendingFilters.q.trim().toLowerCase();
  const filteredIncidents = useMemo(
    () =>
      incidents
        .filter(
          (incident) =>
            matchesStatus(incident, pendingFilters.status) &&
            pendingFilters.impacts.has(incident.impact) &&
            (!trimmedServiceQuery || incident.service.name.toLowerCase().includes(trimmedServiceQuery)) &&
            (pendingFilters.range === "all" || msSince(incident.updated_at) <= RANGE_MS[pendingFilters.range]) &&
            (!onlyNew || new Date(incident.updated_at).getTime() > lastViewed),
        )
        .sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id))),
    [incidents, pendingFilters, trimmedServiceQuery, onlyNew, lastViewed, pinned],
  );

  // Auto-selects the first *visible* incident, and only ever touches `id` —
  // merged into the existing query string so a filter set from a shared
  // link survives landing on the page with nothing selected yet.
  useEffect(() => {
    if (!selectedId && filteredIncidents.length > 0) {
      const next = mergeParams(searchParams, { id: filteredIncidents[0]!.id });
      router.replace(`/incidents?${next.toString()}`, { scroll: false });
    }
  }, [selectedId, filteredIncidents, searchParams, router]);

  function selectIncident(id: string) {
    const next = mergeParams(searchParams, { id });
    router.push(`/incidents?${next.toString()}`, { scroll: false });
    // Below the lg breakpoint the list and detail stack vertically — without
    // this, picking an incident near the top of the list leaves the detail
    // pane rendering off-screen with nothing to indicate it changed.
    if (window.innerWidth < 1024) {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function updateParams(patch: Record<string, string | null>) {
    router.replace(`/incidents?${mergeParams(searchParams, patch).toString()}`, { scroll: false });
  }

  function toggleImpact(impact: string) {
    setPendingFilters((prev) => {
      const next = new Set(prev.impacts);
      if (next.has(impact)) next.delete(impact);
      else next.add(impact);
      return { ...prev, impacts: next };
    });
  }

  function toggleOnlyNew() {
    updateParams({ new: onlyNew ? null : "1", page: null });
  }

  const hasActiveFilters =
    pendingFilters.status !== "all" ||
    pendingFilters.q.trim() !== "" ||
    pendingFilters.range !== "30d" ||
    pendingFilters.impacts.size !== ALL_IMPACTS.length ||
    onlyNew;

  function clearFilters() {
    setPendingFilters({ status: "all", q: "", range: "30d", impacts: new Set(ALL_IMPACTS) });
    updateParams({ new: null, page: null });
  }

  const countForStatus = (filter: StatusFilter) => incidents.filter((incident) => matchesStatus(incident, filter)).length;
  const newCount = incidents.filter((incident) => new Date(incident.updated_at).getTime() > lastViewed).length;
  const { listRef, minListHeight, totalPages, currentPage, pageItems: pageIncidents } = usePagination(
    filteredIncidents,
    page,
    PAGE_SIZE,
  );

  function goToPage(next: number) {
    updateParams({ page: next === 1 ? null : String(next) });
  }

  return (
    <div className="w-full self-start">
      <h1 className="text-xl font-semibold text-base-content">{t("incidents.title")}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{t("incidents.subtitle")}</p>

      {isLoading ? (
        <p className="text-base-content/50 mt-4 flex items-center gap-2 text-sm">
          <Spinner size="sm" />
          {t("incidents.loading")}
        </p>
      ) : error ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("incidents.unreachable")}</p>
      ) : incidents.length === 0 ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("serviceDetail.noIncidents")}</p>
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
              {newCount > 0 && (
                <button
                  type="button"
                  onClick={toggleOnlyNew}
                  className={`btn btn-xs ${onlyNew ? "btn-primary" : "btn-ghost"}`}
                >
                  {t("incidents.filter.new")} ({newCount})
                </button>
              )}
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className="btn btn-ghost btn-xs">
                  {t("incidents.filter.clearFilters")}
                </button>
              )}
            </form>

            <div className="mt-2 flex flex-wrap justify-end gap-3">
              {ALL_IMPACTS.map((impact) => (
                <label key={impact} className="label cursor-pointer gap-2 text-sm">
                  <input
                    type="checkbox"
                    className={`checkbox checkbox-sm text-white ${IMPACT_CHECKBOX_COLOR[impact]}`}
                    checked={pendingFilters.impacts.has(impact)}
                    onChange={() => toggleImpact(impact)}
                  />
                  {/* impact comes from ALL_IMPACTS, a subset of INDICATOR_STYLES's keys, so the lookup always hits */}
                  {t(INDICATOR_STYLES[impact]!.labelKey)}
                </label>
              ))}
            </div>

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
                  const isNew = new Date(incident.updated_at).getTime() > lastViewed;
                  const isSelected = incident.id === selectedId;
                  return (
                    <li
                      key={incident.id}
                      className={`card card-border bg-base-200 relative flex w-full flex-row items-stretch overflow-hidden shadow-md transition-colors ${
                        isSelected ? "border-primary" : "hover:border-base-content/20"
                      }`}
                    >
                      <div className="absolute top-3 right-4 z-10 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => togglePin(incident.id)}
                          aria-label={t(pinned.has(incident.id) ? "incidents.unpin" : "incidents.pin")}
                          className="text-base-content/40 hover:text-base-content transition-transform hover:scale-110 active:scale-90"
                        >
                          <PinIcon className="h-4 w-8" filled={pinned.has(incident.id)} />
                        </button>
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
                            {isNew && <span className="badge badge-xs badge-primary">{t("incidents.new")}</span>}
                          </div>
                        </div>
                        <div className="text-base-content/50 self-end text-right text-xs whitespace-nowrap">
                          <p>{formatDateTime(incident.updated_at)}</p>
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
              prevLabel={t("incidents.pagination.previous")}
              nextLabel={t("incidents.pagination.next")}
              pageLabel={t("incidents.pagination.page", { page: currentPage, totalPages })}
            />
          </div>

          <div ref={detailRef} className="card card-border bg-base-200 p-4">
            {detail ? (
              <IncidentDetail incident={detail} lastViewed={lastViewed} />
            ) : detailError ? (
              <p className="text-base-content/50 text-sm">{t("incidents.unreachable")}</p>
            ) : selectedIncident ? (
              <p className="text-base-content/50 flex items-center gap-2 text-sm">
                <Spinner size="sm" />
                {t("incidents.loading")}
              </p>
            ) : (
              <p className="text-base-content/50 text-sm">{t("incidents.selectPrompt")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
