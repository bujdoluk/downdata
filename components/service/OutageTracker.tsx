"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDate, minutesBetween, formatDuration } from "@/lib/formatTime";
import { buildOutageTrackerDays } from "@/lib/buildIncidentCalendar";
import { INDICATOR_STYLES } from "@/components/service/statusStyles";
import type { StatuspageIncidentSummary } from "@/types/service";

const TRACKER_DAYS = 30;
const EMPTY_DAY_COLOR = "bg-base-content/10";
// `none` is one of INDICATOR_STYLES' fixed literal keys, always present —
// safe past noUncheckedIndexedAccess.
const OPERATIONAL_DAY_COLOR = INDICATOR_STYLES.none!.dot;

// Single-row sibling of history/IncidentCalendar.tsx's day-cell grid (same
// coloring/tooltip pattern, no week/month layout) — see AGENTS.md's note on
// why this isn't a vendored Tremor Tracker.
export default function OutageTracker({
  incidents,
  timeZone,
  trackedSince,
}: {
  incidents: StatuspageIncidentSummary[];
  timeZone: string;
  trackedSince: string | null;
}) {
  const { t } = useTranslation();
  const days = useMemo(
    () => buildOutageTrackerDays(incidents, TRACKER_DAYS, timeZone, trackedSince),
    [incidents, timeZone, trackedSince],
  );

  return (
    <div className="flex gap-1">
      {days.map((day) => {
        // A day before trackedSince is out of scope entirely, regardless of
        // any incident data on record for it — see ServiceDetail's uptime
        // percentage (lib/uptime.ts), which excludes the same days from its
        // own calculation; keeping both consistent so they can't disagree.
        const color = !day.tracked
          ? EMPTY_DAY_COLOR
          : day.impact
            ? (INDICATOR_STYLES[day.impact]?.dot ?? EMPTY_DAY_COLOR)
            : OPERATIONAL_DAY_COLOR;
        const hasIncidents = day.tracked && day.incidents.length > 0;
        const resolvedIncidents = day.incidents.filter((incident) => incident.resolved_at);
        const totalResolutionMinutes = resolvedIncidents.reduce(
          (sum, incident) => sum + minutesBetween(incident.created_at, incident.resolved_at!),
          0,
        );

        return (
          <div key={day.date} className="tooltip tooltip-bottom flex-1">
            <div className="tooltip-content max-w-80">
              {hasIncidents && <div className="text-left">{day.incidents.map((incident) => incident.name).join("; ")}</div>}
              <div className="text-right">{formatDate(day.date)}</div>
              {hasIncidents && (
                <div className="text-right">
                  {resolvedIncidents.length > 0
                    ? t("history.resolutionTime", { duration: formatDuration(totalResolutionMinutes, t) })
                    : t("history.stillOngoing")}
                </div>
              )}
              {!day.tracked && <div className="text-right">{t("serviceDetail.notTrackedYet")}</div>}
            </div>
            <div
              className={`mx-auto aspect-[1/5] w-1/3 rounded ${color} transition-transform hover:scale-125 hover:ring-2 hover:ring-base-content/40 hover:ring-offset-1 hover:ring-offset-base-100`}
            />
          </div>
        );
      })}
    </div>
  );
}
