"use client";

import { useEffect, useMemo, useState } from "react";
import { Temporal } from "temporal-polyfill";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { ServiceDefinition, StatuspageIncident } from "@/types/service";
import { buildIncidentCalendar } from "@/lib/buildIncidentCalendar";
import IncidentCalendar from "@/components/history/IncidentCalendar";
import { formatDateTime } from "@/lib/formatTime";
import { stripHtml } from "@/lib/stripHtml";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/service/statusStyles";

const CURRENT_YEAR = Temporal.Now.plainDateISO().year;
const ALL_IMPACTS = Object.keys(INDICATOR_STYLES);
const IMPACT_CHECKBOX_COLOR: Record<string, string> = {
  none: "checkbox-success",
  minor: "checkbox-warning",
  major: "checkbox-accent",
  critical: "checkbox-error",
};

function hoursBetween(startIso: string, endIso: string): number {
  return Temporal.Instant.from(endIso).since(Temporal.Instant.from(startIso)).total("hours");
}

export default function HistoryPageContent({ trackedServices }: { trackedServices: ServiceDefinition[] }) {
  const { t, i18n } = useTranslation();
  const services = [...trackedServices].sort((a, b) => a.name.localeCompare(b.name));
  const [slug, setSlug] = useState("");
  const [result, setResult] = useState<{ slug: string; incidents: StatuspageIncident[] } | { slug: string; error: true } | null>(
    null,
  );
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedImpacts, setSelectedImpacts] = useState<Set<string>>(new Set(ALL_IMPACTS));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
  // Falls back to the current year if the previously selected one doesn't
  // apply to whatever service is now loaded — no reset-on-slug-change effect needed.
  const year = years.includes(selectedYear) ? selectedYear : CURRENT_YEAR;

  const relevantIncidents = useMemo(
    () => (incidents ?? []).filter((incident) => selectedImpacts.has(incident.impact)),
    [incidents, selectedImpacts],
  );

  function toggleImpact(impact: string) {
    setSelectedImpacts((current) => {
      const next = new Set(current);
      if (next.has(impact)) next.delete(impact);
      else next.add(impact);
      return next;
    });
  }

  const calendar = useMemo(
    () => buildIncidentCalendar(relevantIncidents, year, i18n.language),
    [relevantIncidents, year, i18n.language],
  );
  const selectedDay = selectedDate ? calendar.days.find((day) => day.date === selectedDate) : null;

  // Derived purely from the already-fetched incidents — no extra requests.
  const summary = useMemo(() => {
    const uniqueIncidents = new Map<string, StatuspageIncident>();
    let daysWithIncident = 0;
    for (const day of calendar.days) {
      if (day.incidents.length > 0) daysWithIncident++;
      for (const incident of day.incidents) uniqueIncidents.set(incident.id, incident);
    }
    const resolved = [...uniqueIncidents.values()].filter((incident) => incident.resolved_at);
    const avgResolutionHours =
      resolved.length > 0
        ? resolved.reduce((sum, incident) => sum + hoursBetween(incident.created_at, incident.resolved_at!), 0) / resolved.length
        : null;
    return { incidentCount: uniqueIncidents.size, daysWithIncident, avgResolutionHours };
  }, [calendar.days]);

  return (
    <div className="w-full max-w-6xl self-start">
      <h1 className="text-base-content text-lg font-semibold">{t("history.title")}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{t("history.subtitle")}</p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <select
          className="select select-bordered select-sm w-56"
          aria-label={t("history.servicePicker")}
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSelectedDate(null);
          }}
        >
          <option value="">{t("history.selectService")}</option>
          {services.map((service) => (
            <option key={service.slug} value={service.slug}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      {!slug ? null : isLoading ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("history.loading")}</p>
      ) : error ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("history.unreachable")}</p>
      ) : incidents && incidents.length === 0 ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("history.empty")}</p>
      ) : incidents ? (
        <>
          <div className="text-base-content/60 mt-4 flex flex-wrap gap-4 text-base">
            <span>{t("history.summary.incidents", { count: summary.incidentCount })}</span>
            <span>{t("history.summary.daysAffected", { count: summary.daysWithIncident })}</span>
            {summary.avgResolutionHours !== null && (
              <span>{t("history.summary.avgResolution", { hours: summary.avgResolutionHours.toFixed(1) })}</span>
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
                {/* impact comes from Object.keys(INDICATOR_STYLES), so the lookup always hits */}
                {t(INDICATOR_STYLES[impact]!.labelKey)}
              </label>
            ))}
          </div>

          <div className="mt-2 flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <IncidentCalendar
                calendar={calendar}
                selectedDate={selectedDate}
                onSelectDay={(date) => setSelectedDate((current) => (current === date ? null : date))}
              />
            </div>
            <div className="flex shrink-0 flex-col gap-0.5">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setSelectedYear(y);
                    setSelectedDate(null);
                  }}
                  className={`btn btn-ghost btn-sm justify-start ${y === year ? "btn-active" : ""}`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {selectedDay && selectedDay.incidents.length > 0 && (
            <div className="card card-border bg-base-200 mt-4 p-4">
              <ul className="flex flex-col gap-3">
                {selectedDay.incidents.map((incident) => {
                  const style = INDICATOR_STYLES[incident.impact] ?? FALLBACK_STYLE;
                  return (
                    <li key={incident.id} className="border-base-content/10 border-t pt-3 first:border-t-0 first:pt-0">
                      <div className="flex items-center gap-2">
                        <p className="text-base-content text-base font-semibold">{incident.name}</p>
                        <span className={`badge badge-xs ${style.badge} text-white`}>{t(style.labelKey)}</span>
                      </div>
                      <p className="text-base-content/40 mt-1 text-xs">
                        {t("incidents.officialPageLabel")}{" "}
                        <a href={incident.shortlink} target="_blank" rel="noreferrer" className="link link-hover">
                          {incident.shortlink}
                        </a>
                      </p>
                      <p className="text-base-content/50 mt-1 text-xs">
                        {incident.resolved_at
                          ? t("history.resolutionTime", { hours: hoursBetween(incident.created_at, incident.resolved_at).toFixed(1) })
                          : t("history.stillOngoing")}
                      </p>
                      <ul className="timeline timeline-vertical mt-2 [--timeline-col-start:auto]">
                        {incident.incident_updates.map((update, i) => (
                          <li key={update.id}>
                            {i > 0 && <hr />}
                            <div className="timeline-start text-base-content/50 text-xs whitespace-nowrap">
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
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
