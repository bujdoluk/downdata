"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { TrackedMaintenanceSummary } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { formatDateTime } from "@/lib/formatTime";
import { isInProgressMaintenance } from "@/lib/isInProgressMaintenance";

// Bare content only, no outer margin/card/sizing — see
// BoardActiveIncidentsPanel's comment; this is its maintenance-side sibling,
// both split out of the old BoardActivityPanel.
export default function BoardActiveMaintenancePanel({
  boardId,
  maintenances,
  timeZone,
}: {
  boardId: string;
  maintenances: TrackedMaintenanceSummary[];
  timeZone: string;
}) {
  const { t } = useTranslation();

  return (
    <>
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
                  className={`card card-border bg-base-100 hover:border-base-content/20 flex flex-row items-center gap-3 p-3 shadow-sm transition-colors ${isActive ? "border-info" : ""}`}
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
                      {formatDateTime(maintenance.scheduled_for, timeZone)}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
