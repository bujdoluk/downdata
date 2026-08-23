import { Temporal } from "temporal-polyfill";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDate, minutesBetween, formatDuration } from "@/lib/formatTime";
import { INDICATOR_STYLES } from "@/components/service/statusStyles";
import type { IncidentCalendarData } from "@/lib/buildIncidentCalendar";

const EMPTY_DAY_COLOR = "bg-base-content/10";
const TODAY = Temporal.Now.plainDateISO().toString();

export default function IncidentCalendar({
  calendar,
  selectedDate,
  onSelectDay,
}: {
  calendar: IncidentCalendarData;
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
}) {
  const { t } = useTranslation();
  const { weeks, days, monthLabels } = calendar;

  return (
    <div
      className="grid w-full gap-[3px]"
      style={{ gridTemplateColumns: `repeat(${weeks}, 1rem)`, gridTemplateRows: "auto repeat(7, 1rem)" }}
    >
      {monthLabels.map((month) => (
        <span
          key={`${month.week}-${month.label}`}
          className="text-base-content/60 text-[10px] font-medium"
          style={{ gridColumn: month.week + 1, gridRow: 1 }}
        >
          {month.label}
        </span>
      ))}

      {days.map((day) => {
        const color = day.impact ? (INDICATOR_STYLES[day.impact]?.dot ?? EMPTY_DAY_COLOR) : EMPTY_DAY_COLOR;
        const hasIncidents = day.incidents.length > 0;
        const resolvedIncidents = day.incidents.filter((incident) => incident.resolved_at);
        const totalResolutionMinutes = resolvedIncidents.reduce(
          (sum, incident) => sum + minutesBetween(incident.created_at, incident.resolved_at!),
          0,
        );

        return (
          <div key={day.date} className="tooltip w-full" style={{ gridColumn: day.week + 1, gridRow: day.dow + 2 }}>
            <div className="tooltip-content max-w-56">
              {hasIncidents && <div className="text-left">{day.incidents.map((incident) => incident.name).join("; ")}</div>}
              <div className="text-right">{formatDate(day.date)}</div>
              {hasIncidents && (
                <div className="text-right">
                  {resolvedIncidents.length > 0
                    ? t("history.resolutionTime", { duration: formatDuration(totalResolutionMinutes, t) })
                    : t("history.stillOngoing")}
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={!hasIncidents}
              onClick={() => onSelectDay(day.date)}
              className={`h-4 w-4 rounded-sm ${color} ${hasIncidents ? "cursor-pointer" : "cursor-default"} ${
                day.date === selectedDate ? "ring-primary ring-2" : ""
              } ${day.date === TODAY ? "outline-base-content/40 outline-2 outline-offset-1" : ""}`}
            />
          </div>
        );
      })}
    </div>
  );
}
