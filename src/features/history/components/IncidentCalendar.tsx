import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { formatDate, minutesBetween, formatDuration } from "@/lib/formatTime";
import { INDICATOR_STYLES } from "@/components/service/statusStyles";
import type { CalendarDay, IncidentCalendarData } from "@/lib/buildIncidentCalendar";

const EMPTY_DAY_COLOR = "bg-base-content/10";
const TOOLTIP_GAP = 8;

const NAV_KEYS: Record<string, [weekDelta: number, dowDelta: number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

function DayTooltip({
  date,
  buttonRefs,
  children,
}: {
  date: string;
  buttonRefs: React.RefObject<Map<string, HTMLButtonElement>>;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ position: "fixed", top: 0, left: 0, visibility: "hidden" });

  useLayoutEffect(() => {
    const el = ref.current;
    const anchor = buttonRefs.current.get(date);
    if (!el || !anchor) return;
    const anchorRect = anchor.getBoundingClientRect();
    const tipRect = el.getBoundingClientRect();

    // Prefers opening above the cell (daisyUI's default); flips below when
    // there isn't room above in the viewport — measured against the actual
    // viewport, not the grid row, so it stays correct for any content height.
    const openBelow = anchorRect.top - tipRect.height - TOOLTIP_GAP < 0;
    const top = openBelow ? anchorRect.bottom + TOOLTIP_GAP : anchorRect.top - tipRect.height - TOOLTIP_GAP;

    // Centered under/over the trigger, clamped so it can't run off the
    // left/right edge of the viewport (the first/last week columns would
    // otherwise push it half off-screen).
    const idealLeft = anchorRect.left + anchorRect.width / 2 - tipRect.width / 2;
    const maxLeft = Math.max(window.innerWidth - tipRect.width - TOOLTIP_GAP, TOOLTIP_GAP);
    const left = Math.min(Math.max(idealLeft, TOOLTIP_GAP), maxLeft);

    setStyle({ position: "fixed", top, left, visibility: "visible" });
  }, [date, buttonRefs]);

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="rounded-field bg-neutral text-neutral-content pointer-events-none z-[9999] max-w-56 px-2 py-1 text-sm shadow-md"
      style={style}
    >
      {children}
    </div>,
    document.body,
  );
}

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
  const { weeks, days, monthLabels, today } = calendar;

  // Roving tabindex (WAI-ARIA grid pattern): exactly one day is ever a tab
  // stop, moved with arrow keys. Necessary because most days have no
  // incidents, so plain Tab order across ~365 buttons would be useless —
  // and empty days are focusable-but-inert below (not disabled) precisely
  // so arrow keys have somewhere to land between real incidents.
  const [focusedDate, setFocusedDate] = useState(() => selectedDate ?? today);
  // Which day's tooltip is currently showing (hover or keyboard focus) —
  // see DayTooltip above for why this isn't daisyUI's normal CSS tooltip.
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());

  function clearHover(date: string) {
    setHoveredDate((current) => (current === date ? null : current));
  }

  // A year switch swaps `days` for an unrelated list, which can leave
  // `focusedDate` pointing at a date that no longer renders anything —
  // derived at render time (not an effect) so tabIndex always lands
  // somewhere real without a setState-during-render/effect cascade.
  const effectiveFocusedDate = days.some((day) => day.date === focusedDate) ? focusedDate : (selectedDate ?? today);

  const dayByPosition = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    for (const day of days) map.set(`${day.week}:${day.dow}`, day);
    return map;
  }, [days]);

  function focusDay(date: string) {
    setFocusedDate(date);
    buttonRefs.current.get(date)?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent, day: CalendarDay) {
    const delta = NAV_KEYS[event.key];
    if (delta) {
      event.preventDefault();
      const next = dayByPosition.get(`${day.week + delta[0]}:${day.dow + delta[1]}`);
      if (next) focusDay(next.date); // clamps at grid edges — no wraparound into another year
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      const first = days[0];
      if (first) focusDay(first.date);
    } else if (event.key === "End") {
      event.preventDefault();
      const last = days[days.length - 1];
      if (last) focusDay(last.date);
    }
  }

  return (
    <div
      className="grid w-full gap-[4px]"
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
        const ariaLabel = hasIncidents
          ? t("history.dayAriaLabel", { date: formatDate(day.date), summary: day.incidents.map((incident) => incident.name).join(", ") })
          : t("history.dayAriaLabelEmpty", { date: formatDate(day.date) });
        return (
          <div key={day.date} style={{ gridColumn: day.week + 1, gridRow: day.dow + 2 }}>
            <button
              ref={(el) => {
                if (el) buttonRefs.current.set(day.date, el);
                else buttonRefs.current.delete(day.date);
              }}
              type="button"
              tabIndex={day.date === effectiveFocusedDate ? 0 : -1}
              aria-label={ariaLabel}
              onFocus={() => {
                setFocusedDate(day.date);
                setHoveredDate(day.date);
              }}
              onBlur={() => clearHover(day.date)}
              onMouseEnter={() => setHoveredDate(day.date)}
              onMouseLeave={() => clearHover(day.date)}
              onKeyDown={(e) => handleKeyDown(e, day)}
              onClick={() => {
                if (hasIncidents) onSelectDay(day.date);
              }}
              className={`h-4 w-4 rounded-sm ${color} ${hasIncidents ? "cursor-pointer" : "cursor-default"} ${
                day.date === selectedDate ? "ring-primary ring-2" : ""
              } ${day.date === today ? "outline-info outline-2 outline-offset-1" : ""}`}
            />
            {hoveredDate === day.date && (
              <DayTooltip date={day.date} buttonRefs={buttonRefs}>
                {hasIncidents && <div className="text-left">{day.incidents.map((incident) => incident.name).join("; ")}</div>}
                <div className="text-right">{formatDate(day.date)}</div>
                {hasIncidents && (
                  <div className="text-right">
                    {resolvedIncidents.length > 0
                      ? t("history.resolutionTime", { duration: formatDuration(totalResolutionMinutes, t) })
                      : t("history.stillOngoing")}
                  </div>
                )}
              </DayTooltip>
            )}
          </div>
        );
      })}
    </div>
  );
}
