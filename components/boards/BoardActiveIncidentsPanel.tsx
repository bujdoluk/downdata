"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { TrackedIncidentSummary } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/service/statusStyles";

// Bare content only, no outer margin/card/sizing — BoardDetailContent's
// grid owns that uniformly across all 6 cells (see its own comment).
// Split out of the old BoardActivityPanel (which paired this with
// BoardActiveMaintenancePanel below in a 2-column layout) so each half can
// be its own same-size grid cell instead.
export default function BoardActiveIncidentsPanel({
  boardId,
  activeIncidents,
}: {
  boardId: string;
  activeIncidents: TrackedIncidentSummary[];
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-base-content/40 text-xs font-semibold tracking-wide uppercase">
          {t("boards.activity.incidentsTitle")}
        </h2>
        <Link
          href={`/incidents?board=${boardId}`}
          className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium"
        >
          {t("boards.activity.viewAll")}
        </Link>
      </div>
      {activeIncidents.length === 0 ? (
        <p className="text-base-content/50 mt-3 text-sm">{t("boards.activity.noIncidents")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {activeIncidents.map((incident) => {
            const Logo = SERVICE_LOGOS[incident.service.slug] ?? FallbackLogo;
            const style = INDICATOR_STYLES[incident.impact] ?? FALLBACK_STYLE;
            return (
              <li key={incident.id}>
                <Link
                  href={`/incidents?board=${boardId}&id=${incident.id}`}
                  className="card card-border bg-base-100 hover:border-base-content/20 flex flex-row items-center gap-3 p-3 shadow-sm transition-colors"
                >
                  <Logo size={20} name={incident.service.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-base-content/50 text-xs">{incident.service.name}</p>
                    <p className="text-base-content truncate text-sm font-medium">{incident.name}</p>
                  </div>
                  <span className={`badge badge-xs shrink-0 ${style.badge} text-white`}>{t(style.labelKey)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
