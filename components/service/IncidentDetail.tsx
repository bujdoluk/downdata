"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDateTime, formatDuration, minutesBetween, epochMs } from "@/lib/formatTime";
import type { TrackedIncident, TrackedMaintenance } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/service/statusStyles";
import { stripHtml } from "@/lib/stripHtml";

// Shared by the Incidents and Maintenance pages' detail column —
// TrackedMaintenance is a strict superset of TrackedIncident (see
// types/service.ts), so one component renders both. lastViewed is
// incident-specific "New" badge state owned by whichever page has it
// (only the Incidents page does today); callers that don't pass one get
// no "New" badges, matching the Maintenance page's existing behavior.
export default function IncidentDetail({
  incident,
  timeZone,
  lastViewed,
}: {
  incident: TrackedIncident | TrackedMaintenance;
  timeZone: string;
  lastViewed?: number;
}) {
  const { t } = useTranslation();

  const impactStyle = INDICATOR_STYLES[incident.impact] ?? FALLBACK_STYLE;
  const Logo = SERVICE_LOGOS[incident.service.slug] ?? FallbackLogo;

  return (
    <div>
      <div className="flex items-center gap-3 text-base-content">
        <Logo size={36} name={incident.service.name} />
        <div>
          <p className="text-base-content/50 text-xs">{incident.service.name}</p>
          <h2 className="text-lg font-semibold">{incident.name}</h2>
          {"scheduled_for" in incident ? (
            <p className="text-base-content/40 text-xs">
              {t("maintenances.scheduledLabel")} {formatDateTime(incident.scheduled_for, timeZone)} –{" "}
              {formatDateTime(incident.scheduled_until, timeZone)}
            </p>
          ) : (
            <>
              <p className="text-base-content/40 text-xs">
                {t("incidents.dateLabel")} {formatDateTime(incident.created_at, timeZone)}
              </p>
              {incident.resolved_at && (
                <p className="text-base-content/40 text-xs">
                  {t("history.resolutionTime", {
                    duration: formatDuration(minutesBetween(incident.created_at, incident.resolved_at), t),
                  })}
                </p>
              )}
            </>
          )}
          <p className="text-base-content/40 text-xs">
            {t("incidents.officialPageLabel")}{" "}
            <a href={incident.shortlink} target="_blank" rel="noreferrer" className="link link-hover">
              {incident.shortlink}
            </a>
          </p>
        </div>
        <span className={`badge badge-xs ml-auto shrink-0 whitespace-nowrap ${impactStyle.badge} text-white`}>
          {t(impactStyle.labelKey)}
        </span>
      </div>

      {incident.incident_updates.length === 0 ? (
        <p className="text-base-content/50 mt-8 text-sm">{t("incidents.noUpdates")}</p>
      ) : (
        <ul className="timeline timeline-vertical mt-8 [--timeline-col-start:auto]">
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
                <p className="flex items-center gap-2 text-base-content text-sm font-medium">
                  {update.status}
                  {lastViewed !== undefined && epochMs(update.created_at) > lastViewed && (
                    <span className="badge badge-xs badge-primary">{t("incidents.new")}</span>
                  )}
                </p>
                <p className="text-base-content/70 mt-1 text-sm whitespace-pre-line">{stripHtml(update.body)}</p>
              </div>
              {i < incident.incident_updates.length - 1 && <hr />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
