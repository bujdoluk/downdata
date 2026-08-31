import * as React from "react";
import { cx, focusRing } from "@/lib/utils";

// Vendored + adapted from Tremor Raw's BarList (https://tremor.so/docs/visualizations/bar-list)
// — Tremor Raw ships as copy-paste source, not an installed package, so this
// file *is* the "installation." Adapted from Tremor's original:
//   - recolored from Tremor's hardcoded blue/gray + `dark:` classes to
//     daisyUI tokens — this app's theme toggle is daisyUI's `data-theme`
//     attribute, not Tailwind's `dark:` variant (unconfigured here), so the
//     stock classes would never track the actual active theme
//   - dropped `href` support — unused by every caller in this app, and
//     Tremor's own version renders it as `<a>` inside the row's `<button>`
//     when `onValueChange` is set, which is invalid nested-interactive HTML
//   - added `color`, a per-bar fill hook — stock BarList paints every bar
//     identically, but this app needs to highlight the selected service
//   - added list semantics (`role="list"`/`"listitem"`, a combined
//     `aria-label` per row) — stock BarList's rows carry no group/list
//     relationship for assistive tech at all
type Bar<T> = T & {
  key?: string;
  value: number;
  name: string;
};

interface BarListProps<T = unknown> extends React.HTMLAttributes<HTMLDivElement> {
  data: Bar<T>[];
  valueFormatter?: (value: number) => string;
  showAnimation?: boolean;
  onValueChange?: (payload: Bar<T>) => void;
  sortOrder?: "ascending" | "descending" | "none";
  // Named barColor, not color — HTMLAttributes<HTMLDivElement> already has a
  // (legacy, string-typed) `color` attribute and the two would collide.
  /** Fill class (a daisyUI `bg-*`) for one bar. Defaults to a flat `bg-primary/50`. */
  barColor?: (item: Bar<T>) => string;
}

const ROW_HEIGHT = "h-8";

function BarListInner<T>(
  {
    data = [],
    valueFormatter = (value) => value.toString(),
    showAnimation = false,
    onValueChange,
    sortOrder = "descending",
    barColor = () => "bg-primary/50",
    className,
    ...props
  }: BarListProps<T>,
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) {
  const Component = onValueChange ? "button" : "div";

  const sortedData = React.useMemo(() => {
    if (sortOrder === "none") return data;
    return [...data].sort((a, b) => (sortOrder === "ascending" ? a.value - b.value : b.value - a.value));
  }, [data, sortOrder]);

  // Width computed alongside its item in one pass, rather than a same-length
  // parallel array indexed by position — noUncheckedIndexedAccess would type
  // that index lookup as possibly-undefined even though the two arrays can
  // never actually drift apart.
  const rows = React.useMemo(() => {
    const maxValue = Math.max(...sortedData.map((item) => item.value), 0);
    return sortedData.map((item) => ({
      item,
      width: item.value === 0 ? 0 : Math.max((item.value / maxValue) * 100, 2),
    }));
  }, [sortedData]);

  return (
    <div ref={forwardedRef} className={cx("flex justify-between space-x-6", className)} aria-sort={sortOrder} {...props}>
      <div className="relative w-full space-y-1.5" role="list">
        {rows.map(({ item, width }) => (
          <Component
            key={item.key ?? item.name}
            onClick={() => onValueChange?.(item)}
            aria-label={`${item.name}: ${valueFormatter(item.value)}`}
            // A <button> keeps its native button semantics — role="listitem"
            // would override those. The read-only <div> fallback gets the
            // role instead, so it still reads as one item of the list above.
            role={Component === "div" ? "listitem" : undefined}
            className={cx("group w-full rounded-sm", focusRing, onValueChange ? "-m-0! cursor-pointer hover:bg-base-content/5" : "")}
          >
            <div
              className={cx(
                "flex items-center rounded-sm transition-all",
                ROW_HEIGHT,
                barColor(item),
                onValueChange ? "transition-opacity group-hover:opacity-80" : "",
                showAnimation ? "duration-800" : "",
              )}
              style={{ width: `${width}%` }}
            >
              <div className="absolute left-2 flex max-w-full pr-2">
                <p className="text-base-content truncate text-sm whitespace-nowrap">{item.name}</p>
              </div>
            </div>
          </Component>
        ))}
      </div>
      {/* Redundant with each row's aria-label above once combined — hidden
          from assistive tech rather than announced twice. */}
      <div className="space-y-1.5" aria-hidden="true">
        {rows.map(({ item }) => (
          <div key={item.key ?? item.name} className={cx("flex items-center justify-end", ROW_HEIGHT)}>
            <p className="text-base-content truncate text-sm leading-none tabular-nums">{valueFormatter(item.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

BarListInner.displayName = "BarList";

// Cast needed because React.forwardRef can't express a generic component on
// its own — without it TS erases <T> and types BarList as only accepting
// Bar<unknown>. Standard pattern for a generic forwardRef component.
const BarList = React.forwardRef(BarListInner) as <T>(
  props: BarListProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> },
) => ReturnType<typeof BarListInner>;

export { BarList, type BarListProps };
