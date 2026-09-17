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

// GET /api/maintenance (getAllStoredMaintenanceSummaries) already filters to
// not-completed, not-yet-ended maintenances server-side (status != completed
// AND (scheduled_until >= now OR status = in_progress)), so the response can
// still contain merely-scheduled (not yet started) rows alongside in-progress
// ones. This feed is deliberately narrower than that: it only ever shows
// maintenance happening right now, not what's upcoming — the /maintenance
// page is still the place to see scheduled-but-not-started maintenance, this
// filter doesn't touch that page or the endpoint itself.
//
// Per-board scoping is used for dedup only (same reasoning as
// MonitorsActiveIncidentsTimeline's own buildTimelineEntries) — a service
// tracked on more than one currently-visible board would otherwise put the
// same maintenance in the feed more than once.
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
  // Every entry here is already in-progress, so the only ordering left is
  // which one started earliest — one global ordering across every board's
  // deduped entries together, not per-board-then-concatenated.
  return entries.sort((a, b) => epochMs(a.maintenance.scheduled_for) - epochMs(b.maintenance.scheduled_for));
}

// Self-contained data-fetching unit, same shape as
// MonitorsActiveIncidentsTimeline.tsx (own useQuery, `boards` from the
// parent for per-board dedup) — deliberately mirrors that component's
// markup too (vertical timeline, both sides populated, icon in the
// middle-column slot) rather than inventing a different layout for what is,
// visually, the same kind of feed.
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

      {/* Same isLoading reasoning as MonitorsActiveIncidentsTimeline's own
          branch — true only on the very first fetch, never on a 60s
          background poll refetch. */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10">
          <Spinner size="lg" />
          <p className="text-base-content/50 text-sm">{t("monitors.maintenanceFeed.loading")}</p>
        </div>
      ) : isError ? (
        // A failed fetch must not read as "nothing in progress" — same
        // reasoning as MonitorsActiveIncidentsTimeline's own isError branch.
        // Reuses maintenances.unreachable, the same string /maintenance
        // itself shows on a load failure.
        <p role="alert" className="text-error mt-3 text-sm">
          {t("maintenances.unreachable")}
        </p>
      ) : entries.length === 0 ? (
        <p className="text-base-content/50 mt-3 text-sm">{t("monitors.maintenanceFeed.noMaintenance")}</p>
      ) : (
        <ul className="timeline timeline-vertical mt-3 max-h-[296px] overflow-y-auto [--timeline-col-start:auto]">
          {entries.map(({ maintenance, boardId }) => {
            const Logo = SERVICE_LOGOS[maintenance.service.slug] ?? FallbackLogo;
            // Every entry here is already in-progress (buildMaintenanceEntries
            // filters out merely-scheduled rows), so there's no muted/full
            // distinction to make anymore — one wrench style for the whole
            // feed.
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
