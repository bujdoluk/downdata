"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDateTime } from "@/lib/formatTime";
import type { TrackedMaintenance } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { PinIcon } from "@/components/icons/NavIcons";
import { usePolledFetch } from "@/lib/usePolledFetch";
import { usePinned } from "@/lib/usePinned";
import { isInProgressMaintenance } from "@/lib/isInProgressMaintenance";
import IncidentDetail from "@/components/service/IncidentDetail";

type StatusFilter = "all" | "scheduled" | "in_progress";

function matchesStatus(maintenance: TrackedMaintenance, filter: StatusFilter): boolean {
  return filter === "all" || maintenance.status === filter;
}

export default function MaintenancePageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, error } = usePolledFetch<{ maintenances: TrackedMaintenance[] }>("/api/maintenance");
  const { pinned, togglePin } = usePinned("pinnedMaintenance");
  const [serviceQuery, setServiceQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const isLoading = !data && !error;
  const maintenances = useMemo(() => data?.maintenances ?? [], [data]);
  const selectedId = searchParams.get("id");
  const selectedMaintenance = maintenances.find((maintenance) => maintenance.id === selectedId);

  useEffect(() => {
    // maintenances[0] is safe — length > 0 is checked first
    if (!selectedId && maintenances.length > 0) {
      router.replace(`/maintenance?id=${maintenances[0]!.id}`, { scroll: false });
    }
  }, [selectedId, maintenances, router]);

  function selectMaintenance(id: string) {
    router.push(`/maintenance?id=${id}`, { scroll: false });
  }

  const trimmedServiceQuery = serviceQuery.trim().toLowerCase();
  const filteredMaintenances = maintenances
    .filter(
      (maintenance) =>
        matchesStatus(maintenance, statusFilter) &&
        (!trimmedServiceQuery || maintenance.service.name.toLowerCase().includes(trimmedServiceQuery)),
    )
    .sort((a, b) => {
      const pinDiff = Number(pinned.has(b.id)) - Number(pinned.has(a.id));
      if (pinDiff !== 0) return pinDiff;
      return Number(isInProgressMaintenance(b)) - Number(isInProgressMaintenance(a));
    });
  const countForStatus = (filter: StatusFilter) =>
    maintenances.filter((maintenance) => matchesStatus(maintenance, filter)).length;

  return (
    <div className="w-full self-start">
      <h1 className="text-xl font-semibold text-base-content">{t("maintenances.title")}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{t("maintenances.subtitle")}</p>

      {isLoading ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("maintenances.loading")}</p>
      ) : error ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("maintenances.unreachable")}</p>
      ) : maintenances.length === 0 ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("maintenances.empty")}</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <form
              className="flex flex-wrap items-center gap-2"
              onReset={() => {
                setServiceQuery("");
                setStatusFilter("all");
              }}
            >
              <input
                type="text"
                className="input input-bordered input-sm w-40"
                aria-label={t("incidents.filter.searchService")}
                placeholder={t("incidents.filter.searchService")}
                value={serviceQuery}
                onChange={(e) => setServiceQuery(e.target.value)}
              />
              <select
                className="select select-bordered select-sm w-40"
                aria-label={t("maintenances.filter.status")}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">
                  {t("maintenances.filter.allStatuses")} ({countForStatus("all")})
                </option>
                <option value="scheduled">
                  {t("maintenances.filter.scheduled")} ({countForStatus("scheduled")})
                </option>
                <option value="in_progress">
                  {t("maintenances.inProgress")} ({countForStatus("in_progress")})
                </option>
              </select>
              <input className="btn btn-square btn-sm" type="reset" value="×" />
            </form>

            {filteredMaintenances.length === 0 ? (
              <p className="text-base-content/50 mt-4 text-sm">{t("maintenances.noMatches")}</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {filteredMaintenances.map((maintenance) => {
                  const Logo = SERVICE_LOGOS[maintenance.service.slug] ?? FallbackLogo;
                  const isActive = isInProgressMaintenance(maintenance);
                  const isSelected = maintenance.id === selectedId;
                  return (
                    <li key={maintenance.id} className="relative">
                      <button
                        type="button"
                        onClick={() => selectMaintenance(maintenance.id)}
                        className={`card card-border bg-base-200 relative flex w-full flex-row items-center gap-3 overflow-hidden p-4 text-left shadow-md transition-colors ${
                          isSelected ? "border-primary" : isActive ? "border-warning" : "hover:border-base-content/20"
                        }`}
                      >
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
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePin(maintenance.id)}
                        aria-label={t(pinned.has(maintenance.id) ? "maintenances.unpin" : "maintenances.pin")}
                        className="text-base-content/40 hover:text-base-content absolute top-3 right-3 z-10 transition-transform hover:scale-110 active:scale-90"
                      >
                        <PinIcon className="h-4 w-4" filled={pinned.has(maintenance.id)} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="card card-border bg-base-200 p-4">
            {selectedMaintenance ? (
              <IncidentDetail incident={selectedMaintenance} />
            ) : (
              <p className="text-base-content/50 text-sm">{t("maintenances.selectPrompt")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
