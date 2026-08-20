"use client";

import { useEffect, useMemo, useState } from "react";
import { Temporal } from "temporal-polyfill";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { ServiceDefinition, StatuspageIncident } from "@/types/service";
import { buildIncidentCalendar } from "@/lib/buildIncidentCalendar";
import IncidentCalendar from "@/components/history/IncidentCalendar";

const CURRENT_YEAR = Temporal.Now.plainDateISO().year;

export default function HistoryPageContent({ trackedServices }: { trackedServices: ServiceDefinition[] }) {
  const { t, i18n } = useTranslation();
  const services = [...trackedServices].sort((a, b) => a.name.localeCompare(b.name));
  const [slug, setSlug] = useState("");
  const [result, setResult] = useState<{ slug: string; incidents: StatuspageIncident[] } | { slug: string; error: true } | null>(
    null,
  );
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

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

  return (
    <div className="w-full max-w-6xl self-start">
      <h1 className="text-base-content text-lg font-semibold">{t("history.title")}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{t("history.subtitle")}</p>

      <select
        className="select select-bordered select-sm mt-4 w-56"
        aria-label={t("history.servicePicker")}
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
      >
        <option value="">{t("history.selectService")}</option>
        {services.map((service) => (
          <option key={service.slug} value={service.slug}>
            {service.name}
          </option>
        ))}
      </select>

      {!slug ? null : isLoading ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("history.loading")}</p>
      ) : error ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("history.unreachable")}</p>
      ) : incidents && incidents.length === 0 ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("history.empty")}</p>
      ) : incidents ? (
        <div className="mt-6 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <IncidentCalendar calendar={buildIncidentCalendar(incidents, year, i18n.language)} />
          </div>
          <div className="flex shrink-0 flex-col gap-0.5">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setSelectedYear(y)}
                className={`btn btn-ghost btn-sm justify-start ${y === year ? "btn-active" : ""}`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
