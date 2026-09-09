"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDateTime, formatMonthYear } from "@/lib/formatTime";
import { TAB_BG_STYLE } from "@/lib/utils";
import type { Slug, ServiceSummaryResponse, StatuspageComponent, Status } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/logos";
import FallbackLogo from "@/components/logos/FallbackLogo";
import OutageTracker from "@/features/monitors/components/OutageTracker";
import RecommendedServices from "@/features/monitors/components/RecommendedServices";
import SearchFilterInput from "@/components/SearchFilterInput";
import { InfoIcon } from "@/components/icons/NavIcons";
import { INDICATOR_STYLES, COMPONENT_STATUS_STYLES, ALL_COMPONENT_STATUSES, FALLBACK_STYLE } from "@/components/statusStyles";
import { ALL_CONTINENTS, CONTINENT_LABEL_KEYS, inferComponentContinent, type Continent } from "@/features/monitors/services/componentRegion";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { useTimeZone } from "@/hooks/useTimeZone";
import { useDebouncedUrlFilters } from "@/hooks/useDebouncedUrlFilters";
import Spinner from "@/components/Spinner";

const POLL_INTERVAL_MS = 60_000;

// Debounced-and-URL-synced state for the component list's continent/status
// filters — mirrors ServiceDetail.tsx's own copy of this exactly (see its
// comment on why parse/serialize/toPatch must be stable module-level
// references), just pointed at this page's own /services/:slug path.
type ComponentFilters = { continents: Set<Continent>; statuses: Set<Status>; q: string };

function parseComponentFilters(searchParams: URLSearchParams): ComponentFilters {
  return {
    continents: new Set((searchParams.get("continents") ?? "").split(",").filter(Boolean) as Continent[]),
    statuses: new Set((searchParams.get("statuses") ?? "").split(",").filter(Boolean) as Status[]),
    q: searchParams.get("q") ?? "",
  };
}

function serializeComponentFilters(f: ComponentFilters): string {
  return JSON.stringify([[...f.continents].sort(), [...f.statuses].sort(), f.q]);
}

function componentFiltersPatch(f: ComponentFilters): Record<string, string | null> {
  return {
    continents: f.continents.size === 0 ? null : [...f.continents].sort().join(","),
    statuses: f.statuses.size === 0 ? null : [...f.statuses].sort().join(","),
    q: f.q.trim() === "" ? null : f.q.trim(),
  };
}

// The public, unauthenticated view of one service — same data source
// (queryKeys.serviceStatus/api/summary/[slug]) and header/uptime/outage
// blocks as features/monitors/components/ServiceDetail.tsx, but only the
// fields that make sense with no session: no per-account Notifications
// tab, no links into behind-login pages (/monitors, /history). A separate
// component rather than an `isPublic` flag on ServiceDetail — same split
// this repo already uses for status pages (BoardStatusPageSettings vs.
// the separate PublicStatusPageContent).
//
// Two independently-centered sections: the header/uptime/outage-graph
// block and the tabs block both stay a focused 50%-of-screen column
// (mx-auto md:w-1/2), matching each other exactly. RecommendedServices is
// absolutely positioned off the tabs column's own right edge (md:left-full)
// rather than sharing a wider flex row with it — that was the first cut,
// but it pulled the tabs off-center relative to the header above them.
// This way the tabs column never moves; the sidebar just floats beside it.
export default function PublicServiceDetail({ slug }: { slug: Slug }) {
  const { t } = useTranslation();
  const timeZone = useTimeZone();
  const { data, isError: error } = useQuery({
    queryKey: queryKeys.serviceStatus(slug),
    queryFn: () => fetchJson<ServiceSummaryResponse>(`/api/summary/${slug}`, { cache: "no-store" }),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const isLoading = !data && !error;
  const overallStyle = INDICATOR_STYLES[data?.status.indicator ?? "unknown"] ?? FALLBACK_STYLE;
  const Logo = SERVICE_LOGOS[slug] ?? FallbackLogo;

  const allComponents = data?.components ?? [];
  // !c.group_id, not === null — see the matching comment in ServiceDetail.tsx.
  const topLevelItems = allComponents
    .filter((c) => !c.group_id)
    .sort((a, b) => a.position - b.position);
  const childrenOf = (groupId: string) =>
    allComponents.filter((c) => c.group_id === groupId).sort((a, b) => a.position - b.position);

  // Best-effort continent inference from component names — see
  // features/monitors/services/componentRegion.ts. Only offer a continent
  // as a filter if this service actually has a component in it.
  const componentsById = new Map(allComponents.map((c) => [c.id, c]));
  const continentOf = (c: StatuspageComponent) => inferComponentContinent(c, componentsById);
  const presentContinents = ALL_CONTINENTS.filter((continent) =>
    allComponents.some((c) => !c.group && continentOf(c) === continent),
  );

  // Real field, not a guess like continent — only offer a status as a
  // filter if some component is actually reporting it right now.
  const presentStatuses = ALL_COMPONENT_STATUSES.filter((status) => allComponents.some((c) => !c.group && c.status === status));

  const { pendingFilters, setPendingFilters } = useDebouncedUrlFilters({
    path: `/services/${slug}`,
    parse: parseComponentFilters,
    serialize: serializeComponentFilters,
    toPatch: componentFiltersPatch,
  });
  const { continents: selectedContinents, statuses: selectedStatuses, q: componentQuery } = pendingFilters;
  const trimmedComponentQuery = componentQuery.trim().toLowerCase();

  const isVisible = (c: StatuspageComponent) => {
    if (selectedContinents.size > 0) {
      const continent = continentOf(c);
      if (continent === null || !selectedContinents.has(continent)) return false;
    }
    if (selectedStatuses.size > 0 && !selectedStatuses.has(c.status)) return false;
    if (trimmedComponentQuery && !c.name.toLowerCase().includes(trimmedComponentQuery)) return false;
    return true;
  };

  function toggleContinent(continent: Continent) {
    setPendingFilters((prev) => {
      const next = new Set(prev.continents);
      if (next.has(continent)) next.delete(continent);
      else next.add(continent);
      return { ...prev, continents: next };
    });
  }

  function toggleStatus(status: Status) {
    setPendingFilters((prev) => {
      const next = new Set(prev.statuses);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return { ...prev, statuses: next };
    });
  }

  const visibleComponentCount = allComponents.filter((c) => !c.group && isVisible(c)).length;

  function componentRow(c: StatuspageComponent, indent = false) {
    const s = COMPONENT_STATUS_STYLES[c.status] ?? FALLBACK_STYLE;
    return (
      <li key={c.id} className={`list-row items-center py-2.5 ${indent ? "pl-6" : ""}`}>
        <span className="list-col-grow text-base-content text-sm">{c.name}</span>
        <span className={`badge badge-soft ${s.badge}`}>{t(s.labelKey)}</span>
      </li>
    );
  }

  return (
    <div className="w-full self-start">
      <div className="mx-auto w-full md:w-1/2">
        <Link href="/landing-page" className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium">
          {t("serviceDetail.back")}
        </Link>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-4 text-base-content">
          <div className="flex items-center gap-3">
            <Logo size={36} name={data?.service.name ?? slug} />
            <div>
              <h1 className="text-xl font-semibold">{data?.service.name ?? slug}</h1>
              {data?.service.host && (
                <a
                  href={`https://${data.service.host}`}
                  target="_blank"
                  rel="noreferrer"
                  className="link link-hover text-base-content/50 hover:text-base-content text-xs"
                >
                  {data.service.host}
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isLoading ? (
              <Spinner size="xs" className="text-base-content/40" />
            ) : (
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${error ? "bg-base-content/20" : overallStyle.dot}`} />
            )}
            <p className={`text-sm font-medium whitespace-nowrap ${error || isLoading ? "text-base-content/50" : overallStyle.text}`}>
              {isLoading
                ? t("serviceDetail.checkingStatus")
                : error
                  ? t("serviceDetail.unreachable")
                  : data?.status.description}
            </p>
          </div>
        </div>

        {data && data.trackedSince && (
          <div className="text-base-content/50 mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
            <p className="text-base-content/40 text-xs">
              {t("serviceDetail.trackedSince", { date: formatMonthYear(data.trackedSince, timeZone) })}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-right">
              <span className="inline-flex items-center gap-1">
                <Trans
                  i18nKey="serviceDetail.uptime30d"
                  values={{ value: data.official30daysUptime, days: data.uptimeWindowDays }}
                  components={[<span key="0" className="text-base-content text-base font-bold" />]}
                />
                <span className="tooltip" data-tip={t("serviceDetail.uptime30dMethodology")}>
                  <InfoIcon className="text-base-content/40" />
                </span>
              </span>
              {data.officialAllTimeUptime !== null && (
                <span className="inline-flex items-center gap-1">
                  <Trans
                    i18nKey="serviceDetail.uptimeAllTime"
                    values={{ value: data.officialAllTimeUptime }}
                    components={[<span key="0" className="text-base-content text-base font-bold" />]}
                  />
                  <span className="tooltip" data-tip={t("serviceDetail.uptimeMethodology")}>
                    <InfoIcon className="text-base-content/40" />
                  </span>
                </span>
              )}
            </div>
          </div>
        )}

        {data && (
          <div className="mt-4">
            <OutageTracker incidents={data.last30DaysIncidents} timeZone={timeZone} trackedSince={data.trackedSince} />
          </div>
        )}
      </div>

      {data && (
        <div className="relative mx-auto mt-8 w-full md:w-1/2">
          <div role="tablist" className="tabs tabs-lift">
            <input
              type="radio"
              name="publicServiceDetailTabs"
              className="tab"
              aria-label={`${t("serviceDetail.components")} (${visibleComponentCount})`}
              style={TAB_BG_STYLE}
              defaultChecked
            />
            <div className="tab-content bg-[var(--color-surface-1)] border-base-300 p-6">
              <div className="mb-3">
                <SearchFilterInput
                  value={componentQuery}
                  onChange={(q) => setPendingFilters((prev) => ({ ...prev, q }))}
                  label={t("serviceDetail.searchComponents")}
                />
              </div>
              {presentContinents.length === 0 ? (
                <p className="text-base-content/50 mb-3 text-sm">{t("serviceDetail.noLocationsToFilter")}</p>
              ) : (
                <div className="mb-3 flex flex-wrap gap-3">
                  {presentContinents.map((continent) => (
                    <label key={continent} className="label cursor-pointer gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={selectedContinents.has(continent)}
                        onChange={() => toggleContinent(continent)}
                      />
                      {t(CONTINENT_LABEL_KEYS[continent])}
                    </label>
                  ))}
                </div>
              )}
              {presentStatuses.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-3">
                  {presentStatuses.map((status) => {
                    const style = COMPONENT_STATUS_STYLES[status] ?? FALLBACK_STYLE;
                    return (
                      <label key={status} className="label cursor-pointer gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs"
                          checked={selectedStatuses.has(status)}
                          onChange={() => toggleStatus(status)}
                        />
                        <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                        {t(style.labelKey)}
                      </label>
                    );
                  })}
                </div>
              )}
              {visibleComponentCount === 0 ? (
                <p className="text-base-content/50 text-sm">{t("serviceDetail.noComponentsMatchFilter")}</p>
              ) : (
                <ul className="list bg-[var(--color-surface-2)] border-base-300 border">
                  {topLevelItems.flatMap((item) => {
                    if (item.group) {
                      const visibleChildren = childrenOf(item.id).filter(isVisible);
                      if (visibleChildren.length === 0) return [];
                      return [
                        <li
                          key={item.id}
                          className="bg-base-300/40 text-base-content/50 px-4 py-2 text-[11px] font-semibold tracking-wide uppercase"
                        >
                          {item.name}
                        </li>,
                        ...visibleChildren.map((c) => componentRow(c, true)),
                      ];
                    }
                    return isVisible(item) ? [componentRow(item)] : [];
                  })}
                </ul>
              )}
            </div>

            <input
              type="radio"
              name="publicServiceDetailTabs"
              className="tab"
              aria-label={t("serviceDetail.incidents")}
              style={TAB_BG_STYLE}
            />
            <div className="tab-content bg-[var(--color-surface-1)] border-base-300 p-6">
              {data.incidents.length === 0 ? (
                <p className="text-base-content/50 text-sm">{t("serviceDetail.noIncidents")}</p>
              ) : (
                <ul className="list bg-[var(--color-surface-2)] border-base-300 border">
                  {data.incidents.map((incident) => (
                    <li key={incident.id} className="list-row items-center py-2.5">
                      <div className="list-col-grow min-w-0">
                        <a
                          href={incident.shortlink}
                          target="_blank"
                          rel="noreferrer"
                          className="link link-hover text-base-content text-sm"
                        >
                          {incident.name}
                        </a>
                        <p className="text-base-content/50 mt-0.5 text-xs">{incident.status}</p>
                      </div>
                      <span className="text-base-content/50 self-end text-xs whitespace-nowrap">
                        {formatDateTime(incident.updated_at, timeZone)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <input type="radio" name="publicServiceDetailTabs" className="tab" aria-label={t("serviceDetail.maintenances")} style={TAB_BG_STYLE} />
            <div className="tab-content bg-[var(--color-surface-1)] border-base-300 p-6">
              {data.maintenances.length === 0 ? (
                <p className="text-base-content/50 text-sm">{t("serviceDetail.noMaintenances")}</p>
              ) : (
                <ul className="list bg-[var(--color-surface-2)] border-base-300 border">
                  {data.maintenances.map((maintenance) => (
                    <li key={maintenance.id} className="list-row items-center py-2.5">
                      <div className="list-col-grow min-w-0">
                        <a
                          href={maintenance.shortlink}
                          target="_blank"
                          rel="noreferrer"
                          className="link link-hover text-base-content text-sm"
                        >
                          {maintenance.name}
                        </a>
                        <p className="text-base-content/50 mt-0.5 text-xs">{maintenance.status}</p>
                      </div>
                      <span className="text-base-content/50 self-end text-xs whitespace-nowrap">
                        {formatDateTime(maintenance.scheduled_for, timeZone)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-6 md:absolute md:top-0 md:left-full md:mt-0 md:ml-6 md:w-1/2">
            <RecommendedServices currentSlug={slug} />
          </div>
        </div>
      )}
    </div>
  );
}
