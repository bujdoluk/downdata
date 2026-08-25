"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { TrackedIncidentSummary, TrackedMaintenanceSummary } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { INDICATOR_STYLES, FALLBACK_STYLE } from "@/components/service/statusStyles";
import { formatDateTime } from "@/lib/formatTime";
import { isInProgressMaintenance } from "@/lib/isInProgressMaintenance";

export default function BoardActivityPanel({
  boardId,
  activeIncidents,
  maintenances,
}: {
  boardId: string;
  activeIncidents: TrackedIncidentSummary[];
  maintenances: TrackedMaintenanceSummary[];
}) {
  const { t } = useTranslation();

  if (activeIncidents.length === 0 && maintenances.length === 0) {
    return (
      <div className="card card-border bg-base-200 mt-6 p-4">
        <p className="text-base-content/50 text-sm">{t("boards.activity.allClear")}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section>
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
                    className="card card-border bg-base-200 hover:border-base-content/20 flex flex-row items-center gap-3 p-3 shadow-sm transition-colors"
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
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-base-content/40 text-xs font-semibold tracking-wide uppercase">
            {t("boards.activity.maintenanceTitle")}
          </h2>
          <Link
            href={`/maintenance?board=${boardId}`}
            className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium"
          >
            {t("boards.activity.viewAll")}
          </Link>
        </div>
        {maintenances.length === 0 ? (
          <p className="text-base-content/50 mt-3 text-sm">{t("boards.activity.noMaintenance")}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {maintenances.map((maintenance) => {
              const Logo = SERVICE_LOGOS[maintenance.service.slug] ?? FallbackLogo;
              const isActive = isInProgressMaintenance(maintenance);
              return (
                <li key={maintenance.id}>
                  <Link
                    href={`/maintenance?board=${boardId}&id=${maintenance.id}`}
                    className={`card card-border bg-base-200 hover:border-base-content/20 flex flex-row items-center gap-3 p-3 shadow-sm transition-colors ${isActive ? "border-info" : ""}`}
                  >
                    <Logo size={20} name={maintenance.service.name} />
                    <div className="min-w-0 flex-1">
                      <p className="text-base-content/50 text-xs">{maintenance.service.name}</p>
                      <p className="text-base-content truncate text-sm font-medium">{maintenance.name}</p>
                    </div>
                    {isActive ? (
                      <span className="badge badge-info badge-xs shrink-0">{t("maintenances.inProgress")}</span>
                    ) : (
                      <span className="text-base-content/50 shrink-0 text-xs whitespace-nowrap">
                        {formatDateTime(maintenance.scheduled_for)}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
