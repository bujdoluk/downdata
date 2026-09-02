"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDateTime, formatTime, formatMonthYear } from "@/lib/formatTime";
import type { Slug, ServiceSummaryResponse, StatuspageComponent, Status } from "@/types/service";
import type { IntegrationDefinition } from "@/types/integration";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import OutageTracker from "@/components/service/OutageTracker";
import SearchFilterInput from "@/components/service/SearchFilterInput";
import { InfoIcon } from "@/components/icons/NavIcons";
import { INDICATOR_STYLES, COMPONENT_STATUS_STYLES, ALL_COMPONENT_STATUSES, FALLBACK_STYLE } from "@/components/service/statusStyles";
import { ALL_CONTINENTS, CONTINENT_LABEL_KEYS, inferComponentContinent, type Continent } from "@/lib/componentRegion";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { TAB_BG_STYLE } from "@/lib/utils";
import { useTimeZone } from "@/hooks/useTimeZone";
import { useDebouncedUrlFilters } from "@/hooks/useDebouncedUrlFilters";
import Spinner from "@/components/Spinner";

const POLL_INTERVAL_MS = 60_000;

// Debounced-and-URL-synced state for the component list's continent/status
// filters — same pattern as IncidentsPageContent/MaintenancePageContent
// (see hooks/useDebouncedUrlFilters), so a filtered view here is a
// shareable/bookmarkable link instead of vanishing on refresh. parse/
// serialize/toPatch must be stable module-level references, not redefined
// per render (see that hook's own comment).
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

const INTEGRATION_LABEL_KEYS: Record<IntegrationDefinition["slug"], string> = {
  slack: "nav.slack",
  email: "nav.email",
  sms: "nav.sms",
};

// Reads/writes this one service's membership in each of the current
// account's own connected integrations' target filters — see
// app/api/integrations/[slug]/services/[serviceSlug].
function NotificationsCard({ slug }: { slug: Slug }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: integrations } = useQuery({
    queryKey: queryKeys.integrations.list(),
    queryFn: () => fetchJson<IntegrationDefinition[]>("/api/integrations"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ integrationSlug, enabled }: { integrationSlug: string; enabled: boolean }) =>
      fetch(`/api/integrations/${integrationSlug}/services/${slug}`, { method: enabled ? "POST" : "DELETE" }),
    onSuccess: (res) => {
      if (res.ok) queryClient.invalidateQueries({ queryKey: queryKeys.integrations.list() });
    },
  });

  if (!integrations || integrations.length === 0) {
    return (
      <p className="text-base-content/50 text-sm">
        {t("serviceDetail.noIntegrationsConnected")}{" "}
        <Link href="/integrations" className="link">
          {t("serviceDetail.manageIntegrations")}
        </Link>
      </p>
    );
  }

  return (
    <ul className="list bg-base-100 border-base-300 border">
      {integrations.map((integration) => {
        // excludedServiceSlugs is an exclusion list — enabled unless this
        // service is explicitly in it, so an integration with nothing
        // excluded (the default) correctly shows every service as on.
        const enabled = !integration.excludedServiceSlugs?.includes(slug);
        return (
          <li key={integration.id} className="list-row items-center py-2.5">
            <span className="text-base-content list-col-grow text-sm">{t(INTEGRATION_LABEL_KEYS[integration.slug])}</span>
            <label className="flex shrink-0 items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={enabled}
                disabled={toggleMutation.isPending}
                onChange={(event) => toggleMutation.mutate({ integrationSlug: integration.slug, enabled: event.target.checked })}
                className="checkbox checkbox-sm checkbox-info"
              />
              {t("serviceDetail.notifyMe")}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export default function ServiceDetail({ slug }: { slug: Slug }) {
  const { t } = useTranslation();
  const timeZone = useTimeZone();
  const { data, isError: error } = useQuery({
    queryKey: queryKeys.serviceStatus(slug),
    queryFn: () => fetchJson<ServiceSummaryResponse>(`/api/summary/${slug}`, { cache: "no-store" }),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const isLoading = !data && !error;
  const overallStyle = INDICATOR_STYLES[data?.status.indicator ?? "unknown"] ?? FALLBACK_STYLE;
  const allComponents = data?.components ?? [];
  const topLevelItems = allComponents
    .filter((c) => c.group_id === null)
    .sort((a, b) => a.position - b.position);
  const childrenOf = (groupId: string) =>
    allComponents.filter((c) => c.group_id === groupId).sort((a, b) => a.position - b.position);

  // Best-effort continent inference from component names — see
  // lib/componentRegion.ts. Only offer a continent as a filter if this
  // service actually has a component in it.
  const componentsById = new Map(allComponents.map((c) => [c.id, c]));
  const continentOf = (c: StatuspageComponent) => inferComponentContinent(c, componentsById);
  const presentContinents = ALL_CONTINENTS.filter((continent) =>
    allComponents.some((c) => !c.group && continentOf(c) === continent),
  );

  // Real field, not a guess like continent — only offer a status as a
  // filter if some component is actually reporting it right now.
  const presentStatuses = ALL_COMPONENT_STATUSES.filter((status) => allComponents.some((c) => !c.group && c.status === status));

  const { pendingFilters, setPendingFilters } = useDebouncedUrlFilters({
    path: `/monitors/${slug}`,
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

  const Logo = SERVICE_LOGOS[slug] ?? FallbackLogo;

  return (
    <div className="mx-auto w-full max-w-6xl self-start">
      <Link href="/monitors" className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium">
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
          <div className="mt-2 flex justify-end">
            <Link
              href={`/history?service=${slug}`}
              className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium"
            >
              {t("serviceDetail.viewFullHistory")}
            </Link>
          </div>
        </div>
      )}

      {data && (
        <>
          <div role="tablist" className="tabs tabs-lift mt-8">
            <input
              type="radio"
              name="serviceDetailTabs"
              className="tab"
              aria-label={`${t("serviceDetail.components")} (${visibleComponentCount})`}
              style={TAB_BG_STYLE}
              defaultChecked
            />
            <div className="tab-content bg-base-200 border-base-300 p-6">
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
                <ul className="list bg-base-100 border-base-300 border">
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

            <input type="radio" name="serviceDetailTabs" className="tab" aria-label={t("serviceDetail.incidents")} style={TAB_BG_STYLE} />
            <div className="tab-content bg-base-200 border-base-300 p-6">
              {data.incidents.length === 0 ? (
                <p className="text-base-content/50 text-sm">{t("serviceDetail.noIncidents")}</p>
              ) : (
                <ul className="list bg-base-100 border-base-300 border">
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

            <input type="radio" name="serviceDetailTabs" className="tab" aria-label={t("serviceDetail.maintenances")} style={TAB_BG_STYLE} />
            <div className="tab-content bg-base-200 border-base-300 p-6">
              {data.maintenances.length === 0 ? (
                <p className="text-base-content/50 text-sm">{t("serviceDetail.noMaintenances")}</p>
              ) : (
                <ul className="list bg-base-100 border-base-300 border">
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

            <input type="radio" name="serviceDetailTabs" className="tab" aria-label={t("serviceDetail.notifications")} style={TAB_BG_STYLE} />
            <div className="tab-content bg-base-200 border-base-300 p-6">
              <NotificationsCard slug={slug} />
            </div>
          </div>

          <p className="text-base-content/30 mt-6 text-[11px]">
            {t("serviceDetail.lastUpdated", { time: formatTime(data.page.updated_at, timeZone) })}
          </p>
        </>
      )}
    </div>
  );
}
