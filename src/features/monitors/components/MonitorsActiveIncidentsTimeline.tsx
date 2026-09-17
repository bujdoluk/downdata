"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { Board } from "@/types/board";
import type { ServiceStatusBatchResponse, TrackedIncidentSummary } from "@/types/service";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { INDICATOR_STYLES, FALLBACK_STYLE, INDICATOR_RANK } from "@/components/statusStyles";
import { isActiveIncident } from "@/features/boards/services/isActiveIncident";
import { AlertIcon } from "@/components/icons/NavIcons";
import { SERVICE_LOGOS } from "@/components/logos";
import FallbackLogo from "@/components/logos/FallbackLogo";
import Spinner from "@/components/Spinner";

const POLL_INTERVAL_MS = 60_000;

// Missing/errored rollup data means "unknown," not "none" — defaulting the
// comparison to rank 0 would make almost every real incident (minor and up)
// look alert-tier during the loading window or a status-fetch failure. No
// rollup to compare against means this incident is never flagged alert.
export function isAlertIncident(incident: TrackedIncidentSummary, data: ServiceStatusBatchResponse | undefined): boolean {
  const status = data?.[incident.service.slug];
  if (!status || !("status" in status)) return false;
  const rollupRank = INDICATOR_RANK[status.status.indicator] ?? 0;
  return (INDICATOR_RANK[incident.impact] ?? 0) > rollupRank;
}

function severityRank(impact: string): number {
  return INDICATOR_RANK[impact] ?? 0;
}

// Shared by sortIncidentsBySeverity and buildTimelineEntries below so the
// two can't silently drift apart — previously each had its own copy of
// this exact comparator, one of them (buildTimelineEntries's) unreachable
// from sortIncidentsBySeverity's own unit tests, so a future edit to one
// copy without the other would pass tests while changing live behavior.
function compareBySeverity(
  a: TrackedIncidentSummary,
  b: TrackedIncidentSummary,
  data: ServiceStatusBatchResponse | undefined,
): number {
  const severityDiff = severityRank(b.impact) - severityRank(a.impact);
  if (severityDiff !== 0) return severityDiff;
  return Number(isAlertIncident(b, data)) - Number(isAlertIncident(a, data));
}

// Exported for unit testing (this repo has no component-rendering test
// setup — see resolveReminderRule.ts for the same reasoning applied to a
// different pure function). Standalone/board-agnostic so it's directly
// testable — buildTimelineEntries below applies this same rule to the
// deduped {incident, boardId} pairs, not to each board's own subset in
// isolation (see that function's own comment for why).
export function sortIncidentsBySeverity(
  incidents: TrackedIncidentSummary[],
  data: ServiceStatusBatchResponse | undefined,
): TrackedIncidentSummary[] {
  return [...incidents].sort((a, b) => compareBySeverity(a, b, data));
}

export type TimelineEntry = { incident: TrackedIncidentSummary; boardId: string };

// One global severity sort across every board's incidents together — most
// severe first overall, not "board A's own incidents, then board B's own
// incidents" (that was this component's original design; reversed per an
// explicit correction: a board with only a minor incident was sorting
// ahead of a different board's critical one just because it came first in
// `boards` order, which read as "backwards" once real data crossed board
// boundaries). Per-board scoping is now used only for dedup (below), not
// for ordering.
//
// A service tracked on more than one of the currently-visible boards
// (MonitorsBoardSection's own grid already allows this — a service renders
// once per board section there) would otherwise put the same incident in
// the timeline more than once: `seen` assigns it to the first board it
// matches, in `boards` order, and skips it for every subsequent board.
// This also keeps every entry's incident id genuinely unique, since
// <li key={...}> below needs it.
export function buildTimelineEntries(
  boards: Board[],
  incidents: TrackedIncidentSummary[],
  data: ServiceStatusBatchResponse | undefined,
): TimelineEntry[] {
  const active = incidents.filter((incident) => isActiveIncident(incident) && incident.impact !== "maintenance");
  const seen = new Set<string>();
  const entries: TimelineEntry[] = [];
  for (const board of boards) {
    const boardSlugs = new Set(board.Slugs);
    for (const incident of active) {
      if (!boardSlugs.has(incident.service.slug) || seen.has(incident.id)) continue;
      seen.add(incident.id);
      entries.push({ incident, boardId: board.id });
    }
  }
  return entries.sort((a, b) => compareBySeverity(a.incident, b.incident, data));
}

export default function MonitorsActiveIncidentsTimeline({
  boards,
  data,
}: {
  boards: Board[];
  data: ServiceStatusBatchResponse | undefined;
}) {
  const { t } = useTranslation();

  const { data: incidentsData, isError, isLoading } = useQuery({
    queryKey: queryKeys.incidents.list(),
    queryFn: () => fetchJson<{ incidents: TrackedIncidentSummary[] }>("/api/incidents"),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const entries = buildTimelineEntries(boards, incidentsData?.incidents ?? [], data);

  return (
    <div>
      <h2 className="text-base-content/40 text-xs font-semibold tracking-wide uppercase">
        {t("monitors.activeIncidents.title")} ({entries.length})
      </h2>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10">
          <Spinner size="lg" />
          <p className="text-base-content/50 text-sm">{t("incidents.loading")}</p>
        </div>
      ) : isError ? (
        <p role="alert" className="text-error mt-3 text-sm">
          {t("incidents.unreachable")}
        </p>
      ) : entries.length === 0 ? (
        <p className="text-base-content/50 mt-3 text-sm">{t("monitors.activeIncidents.noIncidents")}</p>
      ) : (
        <ul className="timeline timeline-vertical mt-3 max-h-[296px] overflow-y-auto [--timeline-col-start:auto]">
          {entries.map(({ incident, boardId }) => {
            const alert = isAlertIncident(incident, data);
            const style = INDICATOR_STYLES[incident.impact] ?? FALLBACK_STYLE;
            const Logo = SERVICE_LOGOS[incident.service.slug] ?? FallbackLogo;
            const iconLabel = alert ? t("monitors.activeIncidents.alertLabel") : t(style.labelKey);
            return (
              <li key={incident.id} className="min-h-16">
                <hr />
                <div className="timeline-start pr-3">
                  {/* role="img" + aria-label, same pattern CatalogServiceCard's
                      own status stripe already uses — a bare icon swap
                      communicates nothing to a screen reader on its own. */}
                  <span role="img" aria-label={iconLabel}>
                    <AlertIcon className={`h-6 w-6 ${style.text}`} />
                  </span>
                </div>
                <div className="timeline-middle">
                  <Logo size={28} name={incident.service.name} />
                </div>
                <Link href={`/incidents?board=${boardId}&id=${incident.id}`} className="timeline-end timeline-box ml-3 line-clamp-2">
                  {incident.name}
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
