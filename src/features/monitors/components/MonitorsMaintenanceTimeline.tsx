"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { TrackedMaintenanceSummary } from "@/types/service";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { epochMs } from "@/lib/formatTime";
import { isInProgressMaintenance } from "@/lib/isInProgressMaintenance";
import { WrenchIcon } from "@/components/icons/NavIcons";
import { SERVICE_LOGOS } from "@/components/logos";
import FallbackLogo from "@/components/logos/FallbackLogo";
import Spinner from "@/components/Spinner";

const POLL_INTERVAL_MS = 60_000;

export type MaintenanceTimelineEntry = { maintenance: TrackedMaintenanceSummary; boardId: string };

// Narrower than /api/maintenance, which also returns upcoming rows: this feed
// shows in-progress only. Boards are used for dedup only.
export function buildMaintenanceEntries(boards: Board[], maintenances: TrackedMaintenanceSummary[]): MaintenanceTimelineEntry[] {
  const inProgress = maintenances.filter(isInProgressMaintenance);
  const seen = new Set<string>();
  const entries: MaintenanceTimelineEntry[] = [];
  for (const board of boards) {
    const boardSlugs = new Set(board.Slugs);
    for (const maintenance of inProgress) {
      if (!boardSlugs.has(maintenance.service.slug) || seen.has(maintenance.id)) continue;
      seen.add(maintenance.id);
      entries.push({ maintenance, boardId: board.id });
    }
  }
  return entries.sort((a, b) => epochMs(a.maintenance.scheduled_for) - epochMs(b.maintenance.scheduled_for));
}

export default function MonitorsMaintenanceTimeline({ boards }: { boards: Board[] }) {
  const { t } = useTranslation();

  const { data, isError, isLoading } = useQuery({
    queryKey: queryKeys.maintenance.list(),
    queryFn: () => fetchJson<{ maintenances: TrackedMaintenanceSummary[] }>("/api/maintenance"),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const entries = buildMaintenanceEntries(boards, data?.maintenances ?? []);

  return (
    <div>
      <h2 className="text-base-content/40 text-xs font-semibold tracking-wide uppercase">
        {t("monitors.maintenanceFeed.title")} ({entries.length})
      </h2>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10">
          <Spinner size="lg" />
          <p className="text-base-content/50 text-sm">{t("monitors.maintenanceFeed.loading")}</p>
        </div>
      ) : isError ? (
        // A failed fetch must not read as "nothing in progress".
        <p role="alert" className="text-error mt-3 text-sm">
          {t("maintenances.unreachable")}
        </p>
      ) : entries.length === 0 ? (
        <p className="text-base-content/50 mt-3 text-sm">{t("monitors.maintenanceFeed.noMaintenance")}</p>
      ) : (
        <ul className="timeline timeline-vertical mt-3 max-h-[296px] overflow-y-auto [--timeline-col-start:auto]">
          {entries.map(({ maintenance, boardId }) => {
            const Logo = SERVICE_LOGOS[maintenance.service.slug] ?? FallbackLogo;
            const iconLabel = t("monitors.maintenanceFeed.inProgressLabel");
            return (
              <li key={maintenance.id} className="min-h-16">
                <hr />
                <div className="timeline-start pr-3">
                  <span role="img" aria-label={iconLabel}>
                    <WrenchIcon className="text-info h-6 w-6" />
                  </span>
                </div>
                <div className="timeline-middle">
                  <Logo size={28} name={maintenance.service.name} />
                </div>
                <Link href={`/maintenance?board=${boardId}&id=${maintenance.id}`} className="timeline-end timeline-box ml-3 line-clamp-2">
                  {maintenance.name}
                </Link>
                <hr />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
