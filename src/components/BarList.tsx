import * as React from "react";
import { cx, focusRing } from "@/lib/utils";

// Vendored from Tremor Raw's BarList (https://tremor.so/docs/visualizations/bar-list), which ships as copy-paste source.
// Changes: daisyUI tokens instead of `dark:` classes (theme is `data-theme`), no `href` (invalid <a> in <button>),
// per-bar `barColor` to highlight a selection, and list semantics for assistive tech.
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
  /** Fill class (a daisyUI `bg-*`) for one bar. Not `color`, which collides with the legacy HTML attribute. */
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

  // Paired with its item so noUncheckedIndexedAccess needs no parallel-array lookup.
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
            // role="listitem" would override a <button>'s native semantics.
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
      {/* Already in each row's aria-label; hidden to avoid announcing twice. */}
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

// Cast: forwardRef can't express a generic component and would erase <T>.
const BarList = React.forwardRef(BarListInner) as <T>(
  props: BarListProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> },
) => ReturnType<typeof BarListInner>;

export { BarList, type BarListProps };
