"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Temporal } from "temporal-polyfill";
import { Trans, useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { Service, Incident } from "@/types/service";
import { buildIncidentCalendar } from "@/lib/buildIncidentCalendar";
import { mergeParams } from "@/lib/mergeParams";
import { parseImpacts, serializeImpacts } from "@/lib/impactsParam";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import type { IncidentCountByService } from "@/lib/getStoredIncident";
import IncidentCalendar from "@/components/history/IncidentCalendar";
import IncidentCountsChart from "@/components/history/IncidentCountsChart";
import ServiceSearchPicker from "@/components/service/ServiceSearchPicker";
import BoardFilterSelect from "@/components/service/BoardFilterSelect";
import ImpactFilterCheckboxes from "@/components/service/ImpactFilterCheckboxes";
import { formatDateTime, minutesBetween, formatDuration } from "@/lib/formatTime";
import { stripHtml } from "@/lib/stripHtml";
import { useTimeZone } from "@/lib/useTimeZone";
import { INDICATOR_STYLES, FALLBACK_STYLE, ALL_IMPACTS } from "@/components/service/statusStyles";
import Spinner from "@/components/Spinner";

const POLL_INTERVAL_MS = 60_000;

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
  // "Today" in the account's chosen timezone, not baked in once at module
  // load in the browser's own — matters right around New Year's, when the
  // two can disagree on what year "now" is.
  const currentYear = useMemo(() => Temporal.Now.zonedDateTimeISO(timeZone).year, [timeZone]);

  const boardId = searchParams.get("board") ?? "";
  const selectedBoard = boards.find((board) => board.id === boardId);
  const services = [...trackedServices]
    .filter((service) => !selectedBoard || selectedBoard.Slugs.includes(service.slug))
    .sort((a, b) => a.name.localeCompare(b.name));

  const slug = searchParams.get("service") ?? "";
  const selectedYear = Number(searchParams.get("year") ?? currentYear);
  const selectedImpacts = parseImpacts(searchParams, ALL_IMPACTS);
  const selectedDate = searchParams.get("date");

  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isError: error,
  } = useQuery({
    queryKey: queryKeys.history.service(slug),
    queryFn: () => fetchJson<{ incidents: Incident[] }>(`/api/history/${slug}`),
    enabled: !!slug,
  });

  const isLoading = !!slug && isHistoryLoading;
  const incidents = historyData?.incidents ?? null;

  function updateParams(patch: Record<string, string | null>) {
    router.replace(`/history?${mergeParams(searchParams, patch).toString()}`, { scroll: false });
  }

  function selectService(newSlug: string) {
    router.push(`/history?${mergeParams(searchParams, { service: newSlug, date: null }).toString()}`, { scroll: false });
  }

  function selectBoard(newBoardId: string) {
    const board = boards.find((b) => b.id === newBoardId);
    // Dropping the currently-selected service if it's outside the newly
    // picked board — otherwise the calendar keeps showing a service that's
    // no longer offered by ServiceSearchPicker's now-filtered list.
    const clearService = slug && board && !board.Slugs.includes(slug);
    const patch: Record<string, string | null> = { board: newBoardId || null, date: null };
    if (clearService) patch.service = null;
    router.push(`/history?${mergeParams(searchParams, patch).toString()}`, { scroll: false });
  }

  // Years with any incident, newest first, always including the current
  // year even with zero incidents so there's always at least one to pick.
  // Bucketed by the same timeZone the calendar grid itself uses below —
  // otherwise an incident near a year boundary could land in a different
  // year here than in the grid.
  const years = useMemo(() => {
    const set = new Set(
      (incidents ?? []).map((incident) => Temporal.Instant.from(incident.created_at).toZonedDateTimeISO(timeZone).year),
    );
    set.add(currentYear);
    return [...set].sort((a, b) => b - a);
  }, [incidents, timeZone, currentYear]);
  // Falls back to the current year if the selected one doesn't apply to
  // whatever service is now loaded, or came from a malformed URL.
  const year = years.includes(selectedYear) ? selectedYear : currentYear;

  function selectYear(y: number) {
    updateParams({ year: y === currentYear ? null : String(y), date: null });
  }

  const relevantIncidents = useMemo(
    () => (incidents ?? []).filter((incident) => selectedImpacts.has(incident.impact)),
    [incidents, selectedImpacts],
  );

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
  const selectedDay = selectedDate ? calendar.days.find((day) => day.date === selectedDate) : null;

  function selectDay(date: string) {
    updateParams({ date: date === selectedDate ? null : date });
  }

  // Derived purely from the already-fetched incidents — no extra requests.
  const summary = useMemo(() => {
    const uniqueIncidents = new Map<string, Incident>();
    for (const day of calendar.days) {
      for (const incident of day.incidents) uniqueIncidents.set(incident.id, incident);
    }
    const resolved = [...uniqueIncidents.values()].filter((incident) => incident.resolved_at);
    const avgResolutionMinutes =
      resolved.length > 0
        ? Math.round(
            // resolved_at is guaranteed here — resolved was filtered on its truthiness above
            resolved.reduce((sum, incident) => sum + minutesBetween(incident.created_at, incident.resolved_at!), 0) / resolved.length,
          )
        : null;
    return { incidentCount: uniqueIncidents.size, avgResolutionMinutes };
  }, [calendar.days]);

  return (
    <div className="w-full self-start">
      <h1 className="text-base-content text-lg font-semibold">{t("history.title")}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{t("history.subtitle")}</p>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-4">
            <ServiceSearchPicker services={services} value={slug} onChange={selectService} placeholder={t("history.selectService")} />
            <BoardFilterSelect boards={boards} value={boardId} onChange={selectBoard} />
          </div>

          {!slug ? null : isLoading ? (
            <p className="text-base-content/50 mt-4 flex items-center gap-2 text-sm">
              <Spinner size="sm" />
              {t("history.loading")}
            </p>
          ) : error ? (
            <p className="text-base-content/50 mt-4 text-sm">{t("history.unreachable")}</p>
          ) : incidents && incidents.length === 0 ? (
            <p className="text-base-content/50 mt-4 text-sm">{t("history.empty")}</p>
          ) : incidents ? (
            <>
              <div className="text-base-content/60 mt-4 flex flex-wrap gap-4 text-base">
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
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-3">
                <ImpactFilterCheckboxes selected={selectedImpacts} onToggle={toggleImpact} />
                <span className="label gap-2 text-sm">
                  <span className="bg-base-content/10 outline-info h-4 w-4 rounded-sm outline-2 outline-offset-1" />
                  {t("history.today")}
                </span>
              </div>

              <div className="mt-2 flex items-start gap-4 overflow-x-auto pb-1">
                <div className="min-w-0 flex-1">
                  <IncidentCalendar calendar={calendar} selectedDate={selectedDate} onSelectDay={selectDay} />
                </div>
                <div className="flex shrink-0 flex-col gap-0.5">
                  {years.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => selectYear(y)}
                      className={`btn btn-ghost btn-sm justify-start ${y === year ? "btn-active" : ""}`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              {selectedDay && selectedDay.incidents.length > 0 ? (
                <div className="card card-border bg-base-200 mt-4 p-4">
                  <ul className="flex flex-col gap-3">
                    {selectedDay.incidents.map((incident) => {
                      const style = INDICATOR_STYLES[incident.impact] ?? FALLBACK_STYLE;
                      return (
                        <li key={incident.id} className="border-base-content/10 border-t pt-3 first:border-t-0 first:pt-0">
                          <details open className="collapse collapse-arrow">
                            <summary className="collapse-title flex min-h-0 items-center gap-2 p-0 pr-6">
                              <p className="text-base-content text-base font-semibold">{incident.name}</p>
                              <span className={`badge badge-xs ${style.badge} text-white`}>{t(style.labelKey)}</span>
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
                                  <li key={update.id}>
                                    {i > 0 && <hr />}
                                    <div className="timeline-start text-base-content/50 w-36 text-right text-xs whitespace-nowrap">
                                      {formatDateTime(update.created_at, timeZone)}
                                    </div>
                                    <div className="timeline-middle">
                                      <span className="bg-base-content/30 block h-2 w-2 rounded-full" />
                                    </div>
                                    <div className="timeline-end timeline-box bg-base-200">
                                      <p className="text-base-content text-sm font-medium">{update.status}</p>
                                      <p className="text-base-content/70 mt-1 text-sm whitespace-pre-line">{stripHtml(update.body)}</p>
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
                </div>
              ) : (
                <p className="text-base-content/50 mt-4 text-sm">{t("history.selectPrompt")}</p>
              )}
            </>
          ) : null}
        </div>

        {services.length > 0 && (
          <div>
            <IncidentCountsChart services={services} counts={countsData?.counts ?? []} selectedSlug={slug} onSelectService={selectService} />
          </div>
        )}
      </div>
    </div>
  );
}
