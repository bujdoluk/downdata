"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDateTime, msSince } from "@/lib/formatTime";
import type { ServiceDefinition, TrackedIncident } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/service/statusStyles";
import { PinIcon } from "@/components/icons/NavIcons";
import { usePolledFetch } from "@/lib/usePolledFetch";
import { usePinned } from "@/lib/usePinned";
import { useIncidentsLastViewed } from "@/lib/useIncidentsLastViewed";

type StatusFilter = "all" | "investigating" | "identified" | "monitoring" | "resolved" | "postmortem";
type TimeRange = "all" | "24h" | "7d" | "30d";

const RANGE_MS: Record<Exclude<TimeRange, "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const PAGE_SIZE = 7;

function matchesStatus(incident: TrackedIncident, filter: StatusFilter): boolean {
  return filter === "all" || incident.status === filter;
}

export default function IncidentsPageContent() {
  const { t } = useTranslation();
  const { data, error } = usePolledFetch<{ incidents: TrackedIncident[] }>("/api/incidents");
  const { pinned, togglePin } = usePinned("pinnedIncidents");
  const lastViewed = useIncidentsLastViewed(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [timeRangeFilter, setTimeRangeFilter] = useState<TimeRange>("all");
  const [page, setPage] = useState(1);

  const isLoading = !data && !error;
  const incidents = useMemo(() => data?.incidents ?? [], [data]);
  const services = useMemo(() => {
    const map = new Map<string, ServiceDefinition>();
    for (const incident of incidents) map.set(incident.service.slug, incident.service);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [incidents]);
  const filteredIncidents = incidents
    .filter(
      (incident) =>
        matchesStatus(incident, statusFilter) &&
        (serviceFilter === "all" || incident.service.slug === serviceFilter) &&
        (timeRangeFilter === "all" || msSince(incident.updated_at) <= RANGE_MS[timeRangeFilter]),
    )
    .sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)));
  const countForStatus = (filter: StatusFilter) =>
    incidents.filter((incident) => matchesStatus(incident, filter)).length;
  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageIncidents = filteredIncidents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="w-full max-w-6xl self-start">
      <h1 className="text-xl font-semibold text-base-content">{t("incidents.title")}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{t("incidents.subtitle")}</p>

      {isLoading ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("incidents.loading")}</p>
      ) : error ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("incidents.unreachable")}</p>
      ) : incidents.length === 0 ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("serviceDetail.noIncidents")}</p>
      ) : (
        <>
          <form
            className="filter mt-4 flex-wrap items-center gap-2"
            onReset={() => {
              setStatusFilter("all");
              setServiceFilter("all");
              setTimeRangeFilter("all");
              setPage(1);
            }}
          >
            <select
              className="select select-bordered select-sm w-40"
              aria-label={t("incidents.filter.service")}
              value={serviceFilter}
              onChange={(e) => {
                setServiceFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">{t("incidents.filter.allServices")}</option>
              {services.map((service) => (
                <option key={service.slug} value={service.slug}>
                  {service.name}
                </option>
              ))}
            </select>
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
            <input className="btn btn-square btn-sm" type="reset" value="×" />
          </form>

          {filteredIncidents.length === 0 ? (
            <p className="text-base-content/50 mt-4 text-sm">{t("incidents.filter.noMatches")}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {pageIncidents.map((incident) => {
                const Logo = SERVICE_LOGOS[incident.service.slug] ?? FallbackLogo;
                const style = INDICATOR_STYLES[incident.impact] ?? FALLBACK_STYLE;
                const isNew = new Date(incident.updated_at).getTime() > lastViewed;
                return (
                  <li
                    key={incident.id}
                    className="card card-border bg-base-200 hover:border-base-content/20 relative flex w-full flex-row items-stretch overflow-hidden shadow-md transition-colors"
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
                    <Link href={`/incidents/${incident.id}`} className="flex min-w-0 flex-1 items-center gap-3 p-4">
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
                    </Link>
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
        </>
      )}
    </div>
  );
}
