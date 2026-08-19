"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDateTime } from "@/lib/formatTime";
import type { TrackedIncident } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/service/statusStyles";
import { ExternalLinkIcon } from "@/components/icons/NavIcons";
import { usePolledFetch } from "@/lib/usePolledFetch";

type StatusFilter = "active" | "monitoring" | "resolved";

function matchesSingleFilter(incident: TrackedIncident, filter: StatusFilter): boolean {
  if (filter === "active") return incident.status !== "monitoring" && incident.status !== "resolved";
  return incident.status === filter;
}

function matchesFilters(incident: TrackedIncident, filters: Set<StatusFilter>): boolean {
  return filters.size === 0 || [...filters].some((filter) => matchesSingleFilter(incident, filter));
}

export default function IncidentsPageContent() {
  const { t } = useTranslation();
  const { data, error } = usePolledFetch<{ incidents: TrackedIncident[] }>("/api/incidents");
  const [statusFilters, setStatusFilters] = useState<Set<StatusFilter>>(new Set());

  const isLoading = !data && !error;
  const incidents = data?.incidents ?? [];
  const filteredIncidents = incidents.filter((incident) => matchesFilters(incident, statusFilters));
  const countFor = (filter: StatusFilter) => incidents.filter((incident) => matchesSingleFilter(incident, filter)).length;

  function toggleFilter(filter: StatusFilter) {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  }

  return (
    <div className="w-full max-w-6xl self-start">
      <h1 className="text-xl font-semibold text-base-content">{t("incidents.title")}</h1>

      {isLoading ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("incidents.loading")}</p>
      ) : error ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("incidents.unreachable")}</p>
      ) : incidents.length === 0 ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("serviceDetail.noIncidents")}</p>
      ) : (
        <>
          <form className="filter mt-4" onReset={() => setStatusFilters(new Set())}>
            <input
              className="btn checked:[--btn-color:#a855f7] checked:[--btn-fg:#ffffff]"
              type="checkbox"
              name="incidentStatusFilter"
              aria-label={`${t("incidents.filter.active")} (${countFor("active")})`}
              checked={statusFilters.has("active")}
              onChange={() => toggleFilter("active")}
            />
            <input
              className="btn checked:[--btn-color:#a855f7] checked:[--btn-fg:#ffffff]"
              type="checkbox"
              name="incidentStatusFilter"
              aria-label={`${t("incidents.filter.monitoring")} (${countFor("monitoring")})`}
              checked={statusFilters.has("monitoring")}
              onChange={() => toggleFilter("monitoring")}
            />
            <input
              className="btn checked:[--btn-color:#a855f7] checked:[--btn-fg:#ffffff]"
              type="checkbox"
              name="incidentStatusFilter"
              aria-label={`${t("incidents.filter.resolved")} (${countFor("resolved")})`}
              checked={statusFilters.has("resolved")}
              onChange={() => toggleFilter("resolved")}
            />
            <input className="btn btn-square" type="reset" value="×" />
          </form>

          {filteredIncidents.length === 0 ? (
            <p className="text-base-content/50 mt-4 text-sm">{t("incidents.filter.noMatches")}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {filteredIncidents.map((incident) => {
                const Logo = SERVICE_LOGOS[incident.service.slug] ?? FallbackLogo;
                const style = INDICATOR_STYLES[incident.impact] ?? FALLBACK_STYLE;
                return (
                  <li
                    key={incident.id}
                    className="card card-border bg-base-200 hover:border-base-content/20 relative flex w-full flex-row items-stretch overflow-hidden shadow-md transition-colors"
                  >
                    <a
                      href={incident.shortlink}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={t("incidents.officialPage")}
                      className="text-base-content/40 hover:text-base-content absolute top-3 right-7 z-10"
                    >
                      <ExternalLinkIcon className="h-3.5 w-3.5" />
                    </a>
                    <Link href={`/incidents/${incident.id}`} className="flex min-w-0 flex-1 items-center gap-3 p-4">
                      <Logo size={24} name={incident.service.name} />
                      <div className="min-w-0 flex-1">
                        <p className="text-base-content/50 text-xs">{incident.service.name}</p>
                        <p className="text-base-content truncate text-sm font-medium">{incident.name}</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className={`badge badge-xs ${style.badge} text-white`}>{t(style.labelKey)}</span>
                          <div className="shrink-0 text-right">
                            <p className="text-base-content/50 text-xs">{incident.status}</p>
                            <p className="text-base-content/50 text-xs whitespace-nowrap">{formatDateTime(incident.updated_at)}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                    <div className={`w-3 shrink-0 self-stretch ${style.dot}`} aria-hidden="true" />
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
