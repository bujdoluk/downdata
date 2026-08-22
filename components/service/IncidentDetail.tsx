"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDateTime } from "@/lib/formatTime";
import type { TrackedIncident } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/service/statusStyles";
import { stripHtml } from "@/lib/stripHtml";
import { useIncidentsLastViewed } from "@/lib/useIncidentsLastViewed";

export default function IncidentDetail({ incident }: { incident: TrackedIncident | undefined }) {
  const { t } = useTranslation();
  // Read-only: opening one incident shouldn't clear the "New" badge on a
  // different, unrelated incident back on the list.
  const lastViewed = useIncidentsLastViewed(false);

  if (!incident) {
    return <p className="text-base-content/50 text-sm">{t("incidents.selectPrompt")}</p>;
  }

  const impactStyle = INDICATOR_STYLES[incident.impact] ?? FALLBACK_STYLE;
  const Logo = SERVICE_LOGOS[incident.service.slug] ?? FallbackLogo;

  return (
    <div>
      <div className="flex items-center gap-3 text-base-content">
        <Logo size={36} name={incident.service.name} />
        <div>
          <p className="text-base-content/50 text-xs">{incident.service.name}</p>
          <h2 className="text-lg font-semibold">{incident.name}</h2>
          <p className="text-base-content/40 text-xs">
            {t("incidents.officialPageLabel")}{" "}
            <a href={incident.shortlink} target="_blank" rel="noreferrer" className="link link-hover">
              {incident.shortlink}
            </a>
          </p>
        </div>
        <span className={`badge ml-auto ${impactStyle.badge} text-white`}>{t(impactStyle.labelKey)}</span>
      </div>

      {incident.incident_updates.length === 0 ? (
        <p className="text-base-content/50 mt-8 text-sm">{t("incidents.noUpdates")}</p>
      ) : (
        <ul className="timeline timeline-vertical mt-8 [--timeline-col-start:auto]">
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
                <p className="flex items-center gap-2 text-base-content text-sm font-medium">
                  {update.status}
                  {new Date(update.created_at).getTime() > lastViewed && (
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
