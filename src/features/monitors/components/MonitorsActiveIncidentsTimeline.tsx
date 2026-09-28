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

// Missing rollup means "unknown", not "none": never flag alert without one,
// or nearly every incident would look alert-tier while loading.
export function isAlertIncident(incident: TrackedIncidentSummary, data: ServiceStatusBatchResponse | undefined): boolean {
  const status = data?.[incident.service.slug];
  if (!status || !("status" in status)) return false;
  const rollupRank = INDICATOR_RANK[status.status.indicator] ?? 0;
  return (INDICATOR_RANK[incident.impact] ?? 0) > rollupRank;
}

function severityRank(impact: string): number {
  return INDICATOR_RANK[impact] ?? 0;
}

// Shared so the tested sort and buildTimelineEntries can't drift apart.
function compareBySeverity(
  a: TrackedIncidentSummary,
  b: TrackedIncidentSummary,
  data: ServiceStatusBatchResponse | undefined,
): number {
  const severityDiff = severityRank(b.impact) - severityRank(a.impact);
  if (severityDiff !== 0) return severityDiff;
  return Number(isAlertIncident(b, data)) - Number(isAlertIncident(a, data));
}

// Exported for unit tests; there's no component-rendering test setup.
export function sortIncidentsBySeverity(
  incidents: TrackedIncidentSummary[],
  data: ServiceStatusBatchResponse | undefined,
): TrackedIncidentSummary[] {
  return [...incidents].sort((a, b) => compareBySeverity(a, b, data));
}

export type TimelineEntry = { incident: TrackedIncidentSummary; boardId: string };

// One global severity sort, not grouped per board. Boards only dedup: a service
// on several boards shows its incident once, under the first board.
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
