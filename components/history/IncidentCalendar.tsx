import { formatDate } from "@/lib/formatTime";
import { INDICATOR_STYLES } from "@/components/service/statusStyles";
import type { IncidentCalendarData } from "@/lib/buildIncidentCalendar";

const EMPTY_DAY_COLOR = "bg-base-content/10";

export default function IncidentCalendar({ calendar }: { calendar: IncidentCalendarData }) {
  const { weeks, days, monthLabels } = calendar;

  return (
    <div
      className="grid w-full gap-[3px]"
      style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`, gridTemplateRows: "auto repeat(7, minmax(0, 1fr))" }}
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

        return (
          <div key={day.date} className="tooltip w-full" style={{ gridColumn: day.week + 1, gridRow: day.dow + 2 }}>
            <div className="tooltip-content max-w-56">
              {day.incidents.length > 0 && (
                <div className="text-left">{day.incidents.map((incident) => incident.name).join("; ")}</div>
              )}
              <div className="text-right">{formatDate(day.date)}</div>
            </div>
            <div className={`aspect-square w-full rounded-sm ${color}`} />
          </div>
        );
      })}
    </div>
  );
}
