"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDateTime, msSince } from "@/lib/formatTime";
import type { TrackedIncident, TrackedIncidentSummary } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/service/statusStyles";
import Spinner from "@/components/Spinner";
import { PinIcon } from "@/components/icons/NavIcons";
import { usePolledFetch } from "@/lib/usePolledFetch";
import { usePinned } from "@/lib/usePinned";
import { useIncidentsLastViewed } from "@/lib/useIncidentsLastViewed";
import IncidentDetail from "@/components/service/IncidentDetail";

type StatusFilter = "all" | "investigating" | "identified" | "monitoring" | "resolved" | "postmortem";
type TimeRange = "all" | "24h" | "7d" | "30d";

const RANGE_MS: Record<Exclude<TimeRange, "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const PAGE_SIZE = 7;

function matchesStatus(incident: TrackedIncidentSummary, filter: StatusFilter): boolean {
  return filter === "all" || incident.status === filter;
}

export default function IncidentsPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, error } = usePolledFetch<{ incidents: TrackedIncidentSummary[] }>("/api/incidents");
  const { pinned, togglePin } = usePinned("pinnedIncidents");
  const lastViewed = useIncidentsLastViewed(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [serviceQuery, setServiceQuery] = useState("");
  const [timeRangeFilter, setTimeRangeFilter] = useState<TimeRange>("30d");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ id: string; incident: TrackedIncident } | { id: string; error: true } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [minListHeight, setMinListHeight] = useState<number>();

  const isLoading = !data && !error;
  const incidents = useMemo(() => data?.incidents ?? [], [data]);
  const selectedId = searchParams.get("id");
  const selectedIncident = incidents.find((incident) => incident.id === selectedId);
  const selectedServiceSlug = selectedIncident?.service.slug;

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

  useEffect(() => {
    // incidents[0] is safe — length > 0 is checked first
    if (!selectedId && incidents.length > 0) {
      router.replace(`/incidents?id=${incidents[0]!.id}`, { scroll: false });
    }
  }, [selectedId, incidents, router]);

  function selectIncident(id: string) {
    router.push(`/incidents?id=${id}`, { scroll: false });
  }

  const trimmedServiceQuery = serviceQuery.trim().toLowerCase();
  const filteredIncidents = incidents
    .filter(
      (incident) =>
        matchesStatus(incident, statusFilter) &&
        (!trimmedServiceQuery || incident.service.name.toLowerCase().includes(trimmedServiceQuery)) &&
        (timeRangeFilter === "all" || msSince(incident.updated_at) <= RANGE_MS[timeRangeFilter]),
    )
    .sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)));
  const countForStatus = (filter: StatusFilter) =>
    incidents.filter((incident) => matchesStatus(incident, filter)).length;
  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageIncidents = filteredIncidents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // A full page's real rendered height, locked in once, keeps the pagination
  // controls from jumping up when a later (shorter) page has fewer rows —
  // page 1 always has PAGE_SIZE rows whenever pagination is even visible, so
  // this measures before the user could ever see a short page.
  useEffect(() => {
    if (listRef.current && pageIncidents.length === PAGE_SIZE) {
      setMinListHeight(listRef.current.scrollHeight);
    }
  }, [pageIncidents]);

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
                value={serviceQuery}
                onChange={(e) => {
                  setServiceQuery(e.target.value);
                  setPage(1);
                }}
              />
              <select
                className="select select-bordered select-sm w-40"
                aria-label={t("incidents.filter.timeRange")}
                value={timeRangeFilter}
                onChange={(e) => {
                  setTimeRangeFilter(e.target.value as TimeRange);
                  setPage(1);
                }}
              >
                <option value="all">{t("incidents.filter.allTime")}</option>
                <option value="24h">{t("incidents.filter.last24h")}</option>
                <option value="7d">{t("incidents.filter.last7d")}</option>
                <option value="30d">{t("incidents.filter.last30d")}</option>
              </select>
              <select
                className="select select-bordered select-sm w-40"
                aria-label={t("incidents.filter.status")}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as StatusFilter);
                  setPage(1);
                }}
              >
                <option value="all">
                  {t("incidents.filter.allStatuses")} ({countForStatus("all")})
                </option>
                <option value="investigating">
                  {t("incidents.filter.investigating")} ({countForStatus("investigating")})
                </option>
                <option value="identified">
                  {t("incidents.filter.identified")} ({countForStatus("identified")})
                </option>
                <option value="monitoring">
                  {t("incidents.filter.monitoring")} ({countForStatus("monitoring")})
                </option>
                <option value="resolved">
                  {t("incidents.filter.resolved")} ({countForStatus("resolved")})
                </option>
                <option value="postmortem">
                  {t("incidents.filter.postmortem")} ({countForStatus("postmortem")})
                </option>
              </select>
            </form>

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
                        <p className="text-base-content/50 self-end text-xs whitespace-nowrap">{formatDateTime(incident.updated_at)}</p>
                      </button>
                      <div className={`w-3 shrink-0 self-stretch ${style.dot}`} aria-hidden="true" />
                    </li>
                  );
                })}
              </ul>
            )}

            {totalPages > 1 && (
              <div className="join mt-4">
                <button
                  type="button"
                  className="btn join-item btn-sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                  aria-label={t("incidents.pagination.previous")}
                >
                  «
                </button>
                <button type="button" className="btn join-item btn-sm pointer-events-none">
                  {t("incidents.pagination.page", { page: currentPage, totalPages })}
                </button>
                <button
                  type="button"
                  className="btn join-item btn-sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                  aria-label={t("incidents.pagination.next")}
                >
                  »
                </button>
              </div>
            )}
          </div>

          <div className="card card-border bg-base-200 p-4">
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
