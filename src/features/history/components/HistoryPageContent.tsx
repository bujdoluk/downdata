"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Temporal } from "temporal-polyfill";
import { Trans, useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { Service, Incident } from "@/types/service";
import { buildIncidentCalendar } from "@/features/history/services/buildIncidentCalendar";
import { mergeParams } from "@/lib/mergeParams";
import { parseImpacts, serializeImpacts } from "@/lib/impactsParam";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import type { IncidentCountByService } from "@/lib/getStoredIncident";
import IncidentCalendar from "@/features/history/components/IncidentCalendar";
import IncidentCountsChart from "@/features/history/components/IncidentCountsChart";
import ComponentFilterDropdown from "@/features/history/components/ComponentFilterDropdown";
import ServiceSearchPicker from "@/features/monitors/components/ServiceSearchPicker";
import ImpactFilterDropdown from "@/components/ImpactFilterDropdown";
import SearchFilterInput from "@/components/SearchFilterInput";
import { formatDateTime, formatMonthYear, minutesBetween, formatDuration } from "@/lib/formatTime";
import { stripHtml } from "@/lib/stripHtml";
import { TAB_BG_STYLE } from "@/lib/utils";
import { useTimeZone } from "@/hooks/useTimeZone";
import { useSelectedBoard } from "@/hooks/useSelectedBoard";
import { useDebouncedUrlFilters } from "@/hooks/useDebouncedUrlFilters";
import { ALL_IMPACTS, INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/statusStyles";
import { InfoIcon } from "@/components/icons/NavIcons";
import LoadingOverlay from "@/components/LoadingOverlay";

const POLL_INTERVAL_MS = 60_000;

// Empty `components` Set means "no filter": the component list isn't known
// until incidents load, so there's no fixed "everything" set to default to.
type HistoryFilters = { components: Set<string>; q: string };

function parseHistoryFilters(searchParams: URLSearchParams): HistoryFilters {
  return {
    components: new Set((searchParams.get("components") ?? "").split(",").filter(Boolean)),
    q: searchParams.get("q") ?? "",
  };
}

function serializeHistoryFilters(f: HistoryFilters): string {
  return JSON.stringify([[...f.components].sort(), f.q]);
}

function historyFiltersPatch(f: HistoryFilters): Record<string, string | null> {
  return {
    components: f.components.size === 0 ? null : [...f.components].sort().join(","),
    q: f.q.trim() === "" ? null : f.q.trim(),
  };
}

export default function HistoryPageContent({
  trackedServices,
  boards,
}: {
  trackedServices: Service[];
  boards: Board[];
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: countsData } = useQuery({
    queryKey: queryKeys.history.counts(),
    queryFn: () => fetchJson<{ counts: IncidentCountByService[] }>("/api/history/counts", { cache: "no-store" }),
    refetchInterval: POLL_INTERVAL_MS,
  });
  const timeZone = useTimeZone();
  const currentYear = useMemo(() => Temporal.Now.zonedDateTimeISO(timeZone).year, [timeZone]);

  const boardId = searchParams.get("board") ?? "";
  const selectedBoard = boards.find((board) => board.id === boardId);
  const services = [...trackedServices]
    .filter((service) => !selectedBoard || selectedBoard.Slugs.includes(service.slug))
    .sort((a, b) => a.name.localeCompare(b.name));

  const { selectedBoardId } = useSelectedBoard();
  // While the persisted board pick is about to apply, `services` is still
  // unfiltered, so the service-default effect below waits a render.
  const persistedBoardApplies = !searchParams.has("board") && !!selectedBoardId && boards.some((b) => b.id === selectedBoardId);

  useEffect(() => {
    if (persistedBoardApplies) {
      router.replace(`/history?${mergeParams(searchParams, { board: selectedBoardId }).toString()}`, { scroll: false });
    }
  }, [persistedBoardApplies, selectedBoardId, searchParams, router]);

  const slug = searchParams.get("service") ?? "";

  // Default to the first service so the calendar isn't empty. replace, not
  // push, to avoid a spurious back-button entry.
  useEffect(() => {
    if (!persistedBoardApplies && !slug && services.length > 0) {
      // services.length > 0 was just checked above
      const firstSlug = services[0]!.slug;
      router.replace(`/history?${mergeParams(searchParams, { service: firstSlug }).toString()}`, { scroll: false });
    }
  }, [persistedBoardApplies, slug, services, searchParams, router]);

  const selectedYear = Number(searchParams.get("year") ?? currentYear);
  const selectedImpacts = parseImpacts(searchParams, ALL_IMPACTS);
  const selectedDate = searchParams.get("date");

  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isError: error,
  } = useQuery({
    queryKey: queryKeys.history.service(slug),
    queryFn: () =>
      fetchJson<{ incidents: Incident[]; trackedSince: string | null; officialAllTimeUptime: number | null }>(
        `/api/history/${slug}`,
      ),
    enabled: !!slug,
  });

  const isLoading = !!slug && isHistoryLoading;
  const isPickingService = !slug && services.length > 0;
  const incidents = historyData?.incidents ?? null;

  function updateParams(patch: Record<string, string | null>) {
    router.replace(`/history?${mergeParams(searchParams, patch).toString()}`, { scroll: false });
  }

  function selectService(newSlug: string) {
    router.push(
      `/history?${mergeParams(searchParams, { service: newSlug, date: null, components: null, q: null }).toString()}`,
      { scroll: false },
    );
  }

  const { pendingFilters: filters, setPendingFilters: setFilters } = useDebouncedUrlFilters({
    path: "/history",
    parse: parseHistoryFilters,
    serialize: serializeHistoryFilters,
    toPatch: historyFiltersPatch,
  });

  function toggleComponent(id: string) {
    setFilters((prev) => {
      const next = new Set(prev.components);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, components: next };
    });
  }

  // Bucketed in the calendar's timeZone so year-boundary incidents match the grid.
  const years = useMemo(() => {
    const set = new Set(
      (incidents ?? []).map((incident) => Temporal.Instant.from(incident.created_at).toZonedDateTimeISO(timeZone).year),
    );
    set.add(currentYear);
    return [...set].sort((a, b) => a - b);
  }, [incidents, timeZone, currentYear]);
  const year = years.includes(selectedYear) ? selectedYear : currentYear;

  function selectYear(y: number) {
    updateParams({ year: y === currentYear ? null : String(y), date: null });
  }

  type Tab = "detail" | "byService";
  const activeTab: Tab = searchParams.get("tab") === "byService" ? "byService" : "detail";

  function selectTab(tab: Tab) {
    updateParams({ tab: tab === "detail" ? null : tab });
  }

  const allComponents = useMemo(() => {
    const byId = new Map<string, string>();
    for (const incident of incidents ?? []) {
      for (const component of incident.components ?? []) {
        if (!byId.has(component.id)) byId.set(component.id, component.name);
      }
    }
    return [...byId.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [incidents]);

  const relevantIncidents = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return (incidents ?? []).filter((incident) => {
      if (!selectedImpacts.has(incident.impact)) return false;
      // Incidents listing no components stay visible whatever is checked.
      if (filters.components.size > 0 && incident.components && incident.components.length > 0) {
        if (!incident.components.some((component) => filters.components.has(component.id))) return false;
      }
      if (q) {
        const matchesName = incident.name.toLowerCase().includes(q);
        const matchesUpdate = incident.incident_updates.some((update) => stripHtml(update.body).toLowerCase().includes(q));
        if (!matchesName && !matchesUpdate) return false;
      }
      return true;
    });
  }, [incidents, selectedImpacts, filters.components, filters.q]);

  function toggleImpact(impact: string) {
    const next = new Set(selectedImpacts);
    if (next.has(impact)) next.delete(impact);
    else next.add(impact);
    updateParams({ impacts: serializeImpacts(next, ALL_IMPACTS) });
  }

  const calendar = useMemo(
    () => buildIncidentCalendar(relevantIncidents, year, i18n.language, timeZone),
    [relevantIncidents, year, i18n.language, timeZone],
  );
  const todayWithIncident = calendar.days.find((day) => day.date === calendar.today && day.incidents.length > 0);
  const effectiveSelectedDate = selectedDate ?? todayWithIncident?.date ?? null;
  const selectedDay = effectiveSelectedDate ? calendar.days.find((day) => day.date === effectiveSelectedDate) : null;

  function selectDay(date: string) {
    updateParams({ date: date === selectedDate ? null : date });
  }

  const summary = useMemo(() => {
    const uniqueIncidents = new Map<string, Incident>();
    for (const day of calendar.days) {
      for (const incident of day.incidents) uniqueIncidents.set(incident.id, incident);
    }
    const resolved = [...uniqueIncidents.values()].filter((incident) => incident.resolved_at);
    const avgResolutionMinutes =
      resolved.length > 0
        ? Math.round(
            // resolved_at is guaranteed: resolved was filtered on it above
            resolved.reduce((sum, incident) => sum + minutesBetween(incident.created_at, incident.resolved_at!), 0) / resolved.length,
          )
        : null;
    return { incidentCount: uniqueIncidents.size, avgResolutionMinutes };
  }, [calendar.days]);

  return (
    <div className="mx-auto w-full max-w-6xl self-start">
      {(isPickingService || isLoading) && <LoadingOverlay label={t("history.loading")} contained />}

      <h1 className="text-base-content text-lg font-semibold">{t("history.title")}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{t("history.subtitle")}</p>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-4">
          <ServiceSearchPicker services={services} value={slug} onChange={selectService} placeholder={t("history.selectService")} />
          <SearchFilterInput
            value={filters.q}
            onChange={(q) => setFilters((prev) => ({ ...prev, q }))}
            label={t("history.searchPlaceholder")}
            className="w-56"
          />
          <ImpactFilterDropdown selected={selectedImpacts} onToggle={toggleImpact} />
          <ComponentFilterDropdown options={allComponents} selected={filters.components} onToggle={toggleComponent} />
        </div>

        {!slug ? null : isLoading ? null : error ? (
          <p className="text-base-content/50 mt-4 text-sm">{t("history.unreachable")}</p>
        ) : incidents && incidents.length === 0 ? (
          <p className="text-base-content/50 mt-4 text-sm">{t("history.empty")}</p>
        ) : incidents ? (
          <>
            <div className="text-base-content/60 mt-4 flex flex-wrap items-center gap-4 text-base">
              <span>
                <Trans i18nKey="history.summary.incidents" count={summary.incidentCount} components={[<span key="0" className="text-base-content text-1xl font-extrabold" />]} />
              </span>
              {summary.avgResolutionMinutes !== null && (
                <span>
                  <Trans
                    i18nKey="history.summary.avgResolution"
                    values={{ duration: formatDuration(summary.avgResolutionMinutes, t) }}
                    components={[<span key="0" className="text-base-content text-1xl font-extrabold" />]}
                  />
                </span>
              )}
              {historyData?.officialAllTimeUptime != null && (
                <span className="inline-flex items-center gap-1">
                  <Trans
                    i18nKey="serviceDetail.uptimeAllTime"
                    values={{ value: historyData.officialAllTimeUptime }}
                    components={[<span key="0" className="text-base-content text-1xl font-extrabold" />]}
                  />
                  <button
                    type="button"
                    className="tooltip"
                    data-tip={t("serviceDetail.uptimeMethodology")}
                    aria-label={t("serviceDetail.uptimeMethodology")}
                  >
                    <InfoIcon className="text-base-content/40" />
                  </button>
                </span>
              )}
              {historyData?.trackedSince && (
                <span className="ml-auto text-sm">{t("serviceDetail.trackedSince", { date: formatMonthYear(historyData.trackedSince, timeZone) })}</span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <span className="label gap-2 text-sm">
                <span className="bg-base-content/10 outline-info h-4 w-4 rounded-sm outline-2 outline-offset-1" />
                {t("history.today")}
              </span>
            </div>

            <div className="mt-2">
              <div className="overflow-x-auto pb-1">
                <IncidentCalendar calendar={calendar} selectedDate={effectiveSelectedDate} onSelectDay={selectDay} />
              </div>
              <div className="mt-2 flex flex-wrap justify-end gap-1">
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => selectYear(y)}
                    className={`btn btn-ghost btn-sm ${y === year ? "btn-active" : ""}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            <div role="tablist" className="tabs tabs-lift mt-6">
              <input
                type="radio"
                name="historyTabs"
                className="tab"
                aria-label={t("history.detailTab")}
                style={TAB_BG_STYLE}
                checked={activeTab === "detail"}
                onChange={() => selectTab("detail")}
              />
              <div className="tab-content bg-[var(--color-surface-1)] border-base-300 p-6">
                {selectedDay && selectedDay.incidents.length > 0 ? (
                  <ul className="flex flex-col gap-3">
                    {selectedDay.incidents.map((incident) => {
                      const style = INDICATOR_STYLES[incident.impact] ?? FALLBACK_STYLE;
                      return (
                        <li key={incident.id} className="border-base-content/10 border-t pt-3 first:border-t-0 first:pt-0">
                          <details open className="collapse collapse-arrow">
                            <summary className="collapse-title flex min-h-0 items-start gap-2 p-0 pr-6">
                              <span className="min-w-0 flex-1">
                                <span className="text-base-content align-middle text-base font-semibold break-words">{incident.name}</span>
                                <span className={`badge badge-xs align-middle ml-2 ${style.badge} text-white`}>{t(style.labelKey)}</span>
                              </span>
                            </summary>
                            <div className="collapse-content p-0">
                              <p className="text-base-content/40 mt-1 text-xs">
                                {t("incidents.officialPageLabel")}{" "}
                                <a href={incident.shortlink} target="_blank" rel="noreferrer" className="link link-hover">
                                  {incident.shortlink}
                                </a>
                              </p>
                              <p className="text-base-content/50 mt-1 text-xs">
                                {incident.resolved_at
                                  ? t("history.resolutionTime", {
                                      duration: formatDuration(minutesBetween(incident.created_at, incident.resolved_at), t),
                                    })
                                  : t("history.stillOngoing")}
                              </p>
                              <ul className="timeline timeline-vertical mt-2 [--timeline-col-start:auto]">
                                {incident.incident_updates.map((update, i) => (
                                  <li key={update.id} className="min-w-0">
                                    {i > 0 && <hr />}
                                    <div className="timeline-start text-base-content/50 w-36 text-right text-xs whitespace-nowrap">
                                      {formatDateTime(update.created_at, timeZone)}
                                    </div>
                                    <div className="timeline-middle">
                                      <span className="bg-base-content/30 block h-2 w-2 rounded-full" />
                                    </div>
                                    <div className="timeline-end timeline-box bg-[var(--color-surface-2)] min-w-0">
                                      <p className="text-base-content text-sm font-medium wrap-anywhere">{update.status}</p>
                                      <p className="text-base-content/70 mt-1 text-sm whitespace-pre-line wrap-anywhere">{stripHtml(update.body)}</p>
                                    </div>
                                    {i < incident.incident_updates.length - 1 && <hr />}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </details>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-base-content/50 text-sm">{t("history.selectPrompt")}</p>
                )}
              </div>

              <input
                type="radio"
                name="historyTabs"
                className="tab"
                aria-label={t("history.byServiceTab")}
                style={TAB_BG_STYLE}
                checked={activeTab === "byService"}
                onChange={() => selectTab("byService")}
              />
              <div className="tab-content bg-[var(--color-surface-1)] border-base-300 p-6">
                <IncidentCountsChart services={services} counts={countsData?.counts ?? []} selectedSlug={slug} onSelectService={selectService} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
