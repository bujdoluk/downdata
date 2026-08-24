"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Temporal } from "temporal-polyfill";
import { Trans, useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { ServiceDefinition, StatuspageIncident } from "@/types/service";
import { buildIncidentCalendar } from "@/lib/buildIncidentCalendar";
import { mergeParams } from "@/lib/mergeParams";
import { parseImpacts, serializeImpacts } from "@/lib/impactsParam";
import { usePolledFetch } from "@/lib/usePolledFetch";
import type { IncidentCountByService } from "@/lib/getStoredIncident";
import IncidentCalendar from "@/components/history/IncidentCalendar";
import IncidentCountsChart from "@/components/history/IncidentCountsChart";
import ServiceSearchPicker from "@/components/service/ServiceSearchPicker";
import { formatDateTime, minutesBetween, formatDuration } from "@/lib/formatTime";
import { stripHtml } from "@/lib/stripHtml";
import { INDICATOR_STYLES, FALLBACK_STYLE, IMPACT_CHECKBOX_COLOR, ALL_IMPACTS } from "@/components/service/statusStyles";
import Spinner from "@/components/Spinner";

const CURRENT_YEAR = Temporal.Now.plainDateISO().year;

export default function HistoryPageContent({ trackedServices }: { trackedServices: ServiceDefinition[] }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const services = [...trackedServices].sort((a, b) => a.name.localeCompare(b.name));
  const { data: countsData } = usePolledFetch<{ counts: IncidentCountByService[] }>("/api/history/counts");

  const slug = searchParams.get("service") ?? "";
  const selectedYear = Number(searchParams.get("year") ?? CURRENT_YEAR);
  const selectedImpacts = parseImpacts(searchParams, ALL_IMPACTS);
  const selectedDate = searchParams.get("date");

  const [result, setResult] = useState<{ slug: string; incidents: StatuspageIncident[] } | { slug: string; error: true } | null>(
    null,
  );

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    fetch(`/api/history/${slug}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
      .then((data) => {
        if (!cancelled) setResult({ slug, incidents: data.incidents });
      })
      .catch(() => {
        if (!cancelled) setResult({ slug, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const current = result?.slug === slug ? result : null;
  const isLoading = !!slug && !current;
  const error = current && "error" in current;
  const incidents = current && "incidents" in current ? current.incidents : null;

  function updateParams(patch: Record<string, string | null>) {
    router.replace(`/history?${mergeParams(searchParams, patch).toString()}`, { scroll: false });
  }

  function selectService(newSlug: string) {
    router.push(`/history?${mergeParams(searchParams, { service: newSlug, date: null }).toString()}`, { scroll: false });
  }

  // Years with any incident, newest first, always including the current
  // year even with zero incidents so there's always at least one to pick.
  const years = useMemo(() => {
    const timeZone = Temporal.Now.timeZoneId();
    const set = new Set(
      (incidents ?? []).map((incident) => Temporal.Instant.from(incident.created_at).toZonedDateTimeISO(timeZone).year),
    );
    set.add(CURRENT_YEAR);
    return [...set].sort((a, b) => b - a);
  }, [incidents]);
  // Falls back to the current year if the selected one doesn't apply to
  // whatever service is now loaded, or came from a malformed URL.
  const year = years.includes(selectedYear) ? selectedYear : CURRENT_YEAR;

  function selectYear(y: number) {
    updateParams({ year: y === CURRENT_YEAR ? null : String(y), date: null });
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
    () => buildIncidentCalendar(relevantIncidents, year, i18n.language),
    [relevantIncidents, year, i18n.language],
  );
  const selectedDay = selectedDate ? calendar.days.find((day) => day.date === selectedDate) : null;

  function selectDay(date: string) {
    updateParams({ date: date === selectedDate ? null : date });
  }

  // Derived purely from the already-fetched incidents — no extra requests.
  const summary = useMemo(() => {
    const uniqueIncidents = new Map<string, StatuspageIncident>();
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
                {ALL_IMPACTS.map((impact) => (
                  <label key={impact} className="label cursor-pointer gap-2 text-sm">
                    <input
                      type="checkbox"
                      className={`checkbox checkbox-sm text-white ${IMPACT_CHECKBOX_COLOR[impact]}`}
                      checked={selectedImpacts.has(impact)}
                      onChange={() => toggleImpact(impact)}
                    />
                    {/* impact comes from Object.keys(IMPACT_CHECKBOX_COLOR), a subset of INDICATOR_STYLES's keys, so the lookup always hits */}
                    {t(INDICATOR_STYLES[impact]!.labelKey)}
                  </label>
                ))}
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
                                      {formatDateTime(update.created_at)}
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
