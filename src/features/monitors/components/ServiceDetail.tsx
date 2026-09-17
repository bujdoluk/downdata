"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDateTime, formatTime, formatMonthYear } from "@/lib/formatTime";
import type { Slug, ServiceSummaryResponse, StatuspageComponent, Status } from "@/types/service";
import type { IntegrationDefinition } from "@/types/integration";
import { SERVICE_LOGOS } from "@/components/logos";
import FallbackLogo from "@/components/logos/FallbackLogo";
import PageHeader from "@/components/PageHeader";
import OutageTracker from "@/features/monitors/components/OutageTracker";
import SearchFilterInput from "@/components/SearchFilterInput";
import CheckboxFilterDropdown from "@/components/CheckboxFilterDropdown";
import { InfoIcon } from "@/components/icons/NavIcons";
import { INDICATOR_STYLES, COMPONENT_STATUS_STYLES, ALL_COMPONENT_STATUSES, FALLBACK_STYLE } from "@/components/statusStyles";
import MoreSevereIncidentBadge from "@/components/MoreSevereIncidentBadge";
import ComponentFilterModeToggle from "@/features/monitors/components/ComponentFilterModeToggle";
import { useServiceComponentFilter } from "@/features/monitors/hooks/useServiceComponentFilter";
import { ALL_CONTINENTS, CONTINENT_LABEL_KEYS, inferComponentContinent, type Continent } from "@/features/monitors/services/componentRegion";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { TAB_BG_STYLE } from "@/lib/utils";
import { useTimeZone } from "@/hooks/useTimeZone";
import { useDebouncedUrlFilters } from "@/hooks/useDebouncedUrlFilters";
import Spinner from "@/components/Spinner";

const POLL_INTERVAL_MS = 60_000;

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
  webhook: "nav.webhook",
};

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
    <ul className="list bg-[var(--color-surface-2)] border-base-300 border">
      {integrations.map((integration) => {
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
  // Memoized, keyed on the underlying data.components (stable across a
  // same-content refetch — TanStack Query v5's structuralSharing default),
  // not recomputed inline as a fresh array every render.
  // useServiceComponentFilter's debounced-save effect depends on
  // allComponentIds by reference; an unmemoized .map() here would give it a
  // new reference on every unrelated re-render (the 60s poll tick, typing
  // in the component search box, toggling a continent/status filter),
  // re-firing — and re-saving — mid-edit.
  const componentOptions = useMemo(
    () => (data?.components ?? []).filter((c) => !c.group).map((c) => ({ id: c.id, name: c.name })),
    [data?.components],
  );
  const allComponentIds = useMemo(() => componentOptions.map((c) => c.id), [componentOptions]);
  const filter = useServiceComponentFilter(slug, allComponentIds);
  // !c.group_id, not === null: Atlassian always sends group_id (null when
  // top-level), but incident.io-hosted pages (e.g. status.brevo.com) omit
  // the field entirely instead of sending it as null — a strict-equality
  // check against null left every component un-top-level there, so the
  // whole grid rendered empty despite the feed having real components.
  const topLevelItems = allComponents
    .filter((c) => !c.group_id)
    .sort((a, b) => a.position - b.position);
  const childrenOf = (groupId: string) =>
    allComponents.filter((c) => c.group_id === groupId).sort((a, b) => a.position - b.position);

  const componentsById = new Map(allComponents.map((c) => [c.id, c]));
  const continentOf = (c: StatuspageComponent) => inferComponentContinent(c, componentsById);
  const presentContinents = ALL_CONTINENTS.filter((continent) =>
    allComponents.some((c) => !c.group && continentOf(c) === continent),
  );

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

  function clearContinents() {
    setPendingFilters((prev) => ({ ...prev, continents: new Set() }));
  }

  function clearStatuses() {
    setPendingFilters((prev) => ({ ...prev, statuses: new Set() }));
  }

  const visibleComponentCount = allComponents.filter((c) => !c.group && isVisible(c)).length;

  function componentRow(c: StatuspageComponent, indent = false) {
    const s = COMPONENT_STATUS_STYLES[c.status] ?? FALLBACK_STYLE;
    return (
      <li key={c.id} className={`list-row items-center gap-2 py-2.5 ${indent ? "pl-6" : ""}`}>
        {filter.mode === "custom" && (
          <input
            type="checkbox"
            className="checkbox checkbox-xs"
            checked={filter.checked.has(c.id)}
            onChange={() => filter.toggleComponent(c.id)}
            aria-label={t("serviceDetail.componentFilterNotifyFor", { name: c.name })}
          />
        )}
        <span className="list-col-grow text-base-content text-sm">{c.name}</span>
        <span className={`badge badge-soft ${s.badge}`}>{t(s.labelKey)}</span>
      </li>
    );
  }

  const Logo = SERVICE_LOGOS[slug] ?? FallbackLogo;

  return (
    <div className="w-full self-start">
      <PageHeader
        back={
          <Link href="/monitors" className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium">
            {t("serviceDetail.back")}
          </Link>
        }
      >
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4 text-base-content">
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
            {data?.openIncidentImpact && <MoreSevereIncidentBadge incident={data.openIncidentImpact} />}
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
              <button
                type="button"
                className="tooltip"
                data-tip={t("serviceDetail.uptime30dMethodology")}
                aria-label={t("serviceDetail.uptime30dMethodology")}
              >
                <InfoIcon className="text-base-content/40" />
              </button>
            </span>
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
            <div className="tab-content bg-[var(--color-surface-1)] border-base-300 p-6">
              {/* One inline row — continent/status used to each render as
                  their own full checkbox row, which made this tab feel
                  crowded the moment a third row (the notification
                  component-filter toggle, below) was added alongside them.
                  Both are now compact dropdowns (CheckboxFilterDropdown),
                  same collapsed-by-default idiom ImpactFilterDropdown
                  already uses on /incidents and /history. */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <SearchFilterInput
                  value={componentQuery}
                  onChange={(q) => setPendingFilters((prev) => ({ ...prev, q }))}
                  label={t("serviceDetail.searchComponents")}
                  className="w-64"
                />
                {/* presentContinents can legitimately be empty (continent is
                    a best-effort name inference, not a real field — see
                    componentRegion.ts) — the dropdown itself renders
                    nothing for zero options, so without this fallback the
                    row just silently lost the explanation for why no
                    region filter is offered (PublicServiceDetail.tsx still
                    shows it for the same case). */}
                {presentContinents.length === 0 ? (
                  <p className="text-base-content/50 text-xs">{t("serviceDetail.noLocationsToFilter")}</p>
                ) : (
                  <CheckboxFilterDropdown
                    options={presentContinents.map((continent) => ({ value: continent, label: t(CONTINENT_LABEL_KEYS[continent]) }))}
                    selected={selectedContinents}
                    onToggle={(value) => toggleContinent(value as Continent)}
                    onClear={clearContinents}
                    allLabel={t("serviceDetail.allRegions")}
                  />
                )}
                <CheckboxFilterDropdown
                  options={presentStatuses.map((status) => ({
                    value: status,
                    label: t((COMPONENT_STATUS_STYLES[status] ?? FALLBACK_STYLE).labelKey),
                    dotClassName: (COMPONENT_STATUS_STYLES[status] ?? FALLBACK_STYLE).dot,
                  }))}
                  selected={selectedStatuses}
                  onClear={clearStatuses}
                  onToggle={(value) => toggleStatus(value as Status)}
                  allLabel={t("serviceDetail.allComponentStatuses")}
                />
              </div>
              {/* Visually separated from the view filters above — this is a
                  notification setting, not a way to change what's shown in
                  this list, and the border/spacing signals that distinction
                  rather than reading as a third filter row. */}
              {componentOptions.length > 0 && (
                <div className="border-base-300 mb-3 border-t pt-3">
                  <ComponentFilterModeToggle
                    mode={filter.mode}
                    onChooseAll={filter.chooseAll}
                    onChooseCustom={filter.chooseCustom}
                    mustKeepOneWarning={filter.mustKeepOneWarning}
                    saveError={filter.saveError}
                  />
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

            <input type="radio" name="serviceDetailTabs" className="tab" aria-label={t("serviceDetail.incidents")} style={TAB_BG_STYLE} />
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

            <input type="radio" name="serviceDetailTabs" className="tab" aria-label={t("serviceDetail.maintenances")} style={TAB_BG_STYLE} />
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

            <input type="radio" name="serviceDetailTabs" className="tab" aria-label={t("serviceDetail.notifications")} style={TAB_BG_STYLE} />
            <div className="tab-content bg-[var(--color-surface-1)] border-base-300 p-6">
              <NotificationsCard slug={slug} />
            </div>
          </div>

          <p className="text-base-content/30 mt-6 text-[11px]">
            {t("serviceDetail.lastUpdated", { time: formatTime(data.page.updated_at, timeZone) })}
          </p>
        </>
      )}
      </div>
      </PageHeader>
    </div>
  );
}
