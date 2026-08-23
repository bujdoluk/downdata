"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDateTime } from "@/lib/formatTime";
import type { TrackedMaintenance, TrackedMaintenanceSummary } from "@/types/service";
import { SERVICE_LOGOS } from "@/components/service/logos";
import FallbackLogo from "@/components/service/logos/FallbackLogo";
import { PinIcon } from "@/components/icons/NavIcons";
import Spinner from "@/components/Spinner";
import { usePolledFetch } from "@/lib/usePolledFetch";
import { usePinned } from "@/lib/usePinned";
import { isInProgressMaintenance } from "@/lib/isInProgressMaintenance";
import IncidentDetail from "@/components/service/IncidentDetail";

type StatusFilter = "all" | "scheduled" | "in_progress";

const PAGE_SIZE = 7;

function matchesStatus(maintenance: TrackedMaintenanceSummary, filter: StatusFilter): boolean {
  return filter === "all" || maintenance.status === filter;
}

export default function MaintenancePageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, error } = usePolledFetch<{ maintenances: TrackedMaintenanceSummary[] }>("/api/maintenance");
  const { pinned, togglePin } = usePinned("pinnedMaintenance");
  const [serviceQuery, setServiceQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ id: string; maintenance: TrackedMaintenance } | { id: string; error: true } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [minListHeight, setMinListHeight] = useState<number>();

  const isLoading = !data && !error;
  const maintenances = useMemo(() => data?.maintenances ?? [], [data]);
  const selectedId = searchParams.get("id");
  const selectedMaintenance = maintenances.find((maintenance) => maintenance.id === selectedId);
  const selectedServiceSlug = selectedMaintenance?.service.slug;

  // Full timeline for whichever maintenance is selected, fetched
  // separately — see IncidentsPageContent's identical detail-fetch effect
  // for the full reasoning.
  useEffect(() => {
    if (!selectedServiceSlug || !selectedId) return;
    let cancelled = false;
    fetch(`/api/maintenance/${selectedServiceSlug}/${selectedId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
      .then((maintenance) => {
        if (!cancelled) setResult({ id: selectedId, maintenance });
      })
      .catch(() => {
        if (!cancelled) setResult({ id: selectedId, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedServiceSlug, selectedId]);

  const currentResult = result?.id === selectedId ? result : null;
  const detail = currentResult && "maintenance" in currentResult ? currentResult.maintenance : null;
  const detailError = currentResult ? "error" in currentResult : false;

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
  const totalPages = Math.max(1, Math.ceil(filteredMaintenances.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageMaintenances = filteredMaintenances.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // See IncidentsPageContent's identical effect for the full reasoning: lock
  // in a full page's real height so the pagination controls don't jump up
  // on a shorter last page.
  useEffect(() => {
    if (listRef.current && pageMaintenances.length === PAGE_SIZE) {
      setMinListHeight(listRef.current.scrollHeight);
    }
  }, [pageMaintenances]);

  return (
    <div className="w-full self-start">
      <h1 className="text-xl font-semibold text-base-content">{t("maintenances.title")}</h1>
      <p className="text-base-content/60 mt-1 text-sm">{t("maintenances.subtitle")}</p>

      {isLoading ? (
        <p className="text-base-content/50 mt-4 flex items-center gap-2 text-sm">
          <Spinner size="sm" />
          {t("maintenances.loading")}
        </p>
      ) : error ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("maintenances.unreachable")}</p>
      ) : maintenances.length === 0 ? (
        <p className="text-base-content/50 mt-4 text-sm">{t("maintenances.empty")}</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <form className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                className="input input-bordered input-sm w-40"
                aria-label={t("incidents.filter.searchService")}
                placeholder={t("incidents.filter.searchService")}
                value={serviceQuery}
                onChange={(e) => {
                  setServiceQuery(e.target.value);
                  setPage(1);
                }}
              />
              <select
                className="select select-bordered select-sm w-40"
                aria-label={t("maintenances.filter.status")}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as StatusFilter);
                  setPage(1);
                }}
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
            </form>

            {filteredMaintenances.length === 0 ? (
              <p className="text-base-content/50 mt-4 text-sm">{t("maintenances.noMatches")}</p>
            ) : (
              <ul
                ref={listRef}
                style={{ minHeight: totalPages > 1 ? minListHeight : undefined }}
                className="mt-4 flex flex-col gap-3"
              >
                {pageMaintenances.map((maintenance) => {
                  const Logo = SERVICE_LOGOS[maintenance.service.slug] ?? FallbackLogo;
                  const isActive = isInProgressMaintenance(maintenance);
                  const isSelected = maintenance.id === selectedId;
                  return (
                    <li key={maintenance.id} className="relative">
                      <button
                        type="button"
                        onClick={() => selectMaintenance(maintenance.id)}
                        className={`card card-border bg-base-200 relative flex w-full flex-row items-center gap-3 overflow-hidden p-4 text-left shadow-md transition-colors ${
                          isSelected ? "border-primary" : isActive ? "border-info" : "hover:border-base-content/20"
                        }`}
                      >
                        <Logo size={24} name={maintenance.service.name} />
                        <div className="min-w-0 flex-1">
                          <p className="text-base-content/50 text-xs">{maintenance.service.name}</p>
                          <p className="text-base-content truncate text-sm font-medium">{maintenance.name}</p>
                          {isActive ? (
                            <span className="badge badge-info badge-xs mt-1 gap-1.5">
                              <span className="bg-info-content text-info-content animate-pulse-ring h-1.5 w-1.5 rounded-full" />
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

            {totalPages > 1 && (
              <div className="join mt-4">
                <button
                  type="button"
                  className="btn join-item btn-sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                  aria-label={t("maintenances.pagination.previous")}
                >
                  «
                </button>
                <button type="button" className="btn join-item btn-sm pointer-events-none">
                  {t("maintenances.pagination.page", { page: currentPage, totalPages })}
                </button>
                <button
                  type="button"
                  className="btn join-item btn-sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                  aria-label={t("maintenances.pagination.next")}
                >
                  »
                </button>
              </div>
            )}
          </div>

          <div className="card card-border bg-base-200 p-4">
            {detail ? (
              <IncidentDetail incident={detail} />
            ) : detailError ? (
              <p className="text-base-content/50 text-sm">{t("maintenances.unreachable")}</p>
            ) : selectedMaintenance ? (
              <p className="text-base-content/50 flex items-center gap-2 text-sm">
                <Spinner size="sm" />
                {t("maintenances.loading")}
              </p>
            ) : (
              <p className="text-base-content/50 text-sm">{t("maintenances.selectPrompt")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
