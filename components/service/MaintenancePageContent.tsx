"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDateTime } from "@/lib/formatTime";
import type { ServiceDefinition, TrackedMaintenance } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { ExternalLinkIcon, PinIcon } from "@/components/icons/NavIcons";
import { usePolledFetch } from "@/lib/usePolledFetch";
import { usePinned } from "@/lib/usePinned";
import { isInProgressMaintenance } from "@/lib/isInProgressMaintenance";

export default function MaintenancePageContent({ trackedServices }: { trackedServices: ServiceDefinition[] }) {
  const { t } = useTranslation();
  const { data, error } = usePolledFetch<{ maintenances: TrackedMaintenance[] }>("/api/maintenance");
  const { pinned, togglePin } = usePinned("pinnedMaintenance");
  const [serviceFilter, setServiceFilter] = useState<string>("all");

  const isLoading = !data && !error;
  const maintenances = data?.maintenances ?? [];
  const services = [...trackedServices].sort((a, b) => a.name.localeCompare(b.name));
  const filteredMaintenances = maintenances
    .filter((maintenance) => serviceFilter === "all" || maintenance.service.slug === serviceFilter)
    .sort((a, b) => {
      const pinDiff = Number(pinned.has(b.id)) - Number(pinned.has(a.id));
      if (pinDiff !== 0) return pinDiff;
      return Number(isInProgressMaintenance(b)) - Number(isInProgressMaintenance(a));
    });

  return (
    <div className="w-full max-w-6xl self-start">
      <h1 className="text-xl font-semibold text-base-content">{t("maintenances.title")}</h1>

      {isLoading ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("maintenances.loading")}</p>
      ) : error ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("maintenances.unreachable")}</p>
      ) : maintenances.length === 0 ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("maintenances.empty")}</p>
      ) : (
        <>
          <select
            className="select select-bordered select-sm mt-4 w-40"
            aria-label={t("incidents.filter.service")}
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
          >
            <option value="all">{t("incidents.filter.allServices")}</option>
            {services.map((service) => (
              <option key={service.slug} value={service.slug}>
                {service.name}
              </option>
            ))}
          </select>

          {filteredMaintenances.length === 0 ? (
            <p className="text-base-content/50 mt-4 text-sm">{t("maintenances.noMatches")}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {filteredMaintenances.map((maintenance) => {
                const Logo = SERVICE_LOGOS[maintenance.service.slug] ?? FallbackLogo;
                const isActive = isInProgressMaintenance(maintenance);
                return (
                  <li key={maintenance.id} className="relative">
                    <a
                      href={maintenance.shortlink}
                      target="_blank"
                      rel="noreferrer"
                      className={`card card-border bg-base-200 hover:border-base-content/20 relative flex w-full flex-row items-center gap-3 overflow-hidden p-4 shadow-md transition-colors ${
                        isActive ? "border-warning" : ""
                      }`}
                    >
                      <ExternalLinkIcon className="text-base-content/40 hover:text-base-content absolute top-3 right-3 h-4 w-4 transition-transform hover:scale-110" />
                      <Logo size={24} name={maintenance.service.name} />
                      <div className="min-w-0 flex-1">
                        <p className="text-base-content/50 text-xs">{maintenance.service.name}</p>
                        <p className="text-base-content truncate text-sm font-medium">{maintenance.name}</p>
                        {isActive ? (
                          <span className="badge badge-warning badge-xs mt-1 gap-1.5">
                            <span className="bg-warning-content text-warning-content animate-pulse-ring h-1.5 w-1.5 rounded-full" />
                            {t("maintenances.inProgress")}
                          </span>
                        ) : (
                          <p className="text-base-content/50 text-xs">{maintenance.status}</p>
                        )}
                      </div>
                      <p className="text-base-content/50 self-end text-xs whitespace-nowrap">
                        {formatDateTime(maintenance.scheduled_for)} – {formatDateTime(maintenance.scheduled_until)}
                      </p>
                    </a>
                    <button
                      type="button"
                      onClick={() => togglePin(maintenance.id)}
                      aria-label={t(pinned.has(maintenance.id) ? "maintenances.unpin" : "maintenances.pin")}
                      className="text-base-content/40 hover:text-base-content absolute top-3 right-9 z-10 transition-transform hover:scale-110 active:scale-90"
                    >
                      <PinIcon className="h-4 w-4" filled={pinned.has(maintenance.id)} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
