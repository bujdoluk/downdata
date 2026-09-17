"use client";

import { useRef } from "react";
import { useCloseDetailsOnOutsideClick } from "@/hooks/useCloseDetailsOnOutsideClick";

export default function CheckboxFilterDropdown({
  options,
  selected,
  onToggle,
  onClear,
  allLabel,
  className,
}: {
  options: { value: string; label: string; dotClassName?: string }[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  onClear: () => void;
  allLabel: string;
  className?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useCloseDetailsOnOutsideClick(detailsRef);

  if (options.length === 0) return null;

  const isAll = selected.size === 0;
  const summary = isAll
    ? allLabel
    : options
        .filter((option) => selected.has(option.value))
        .map((option) => option.label)
        .join(", ");

  return (
    <details ref={detailsRef} className="dropdown">
      <summary className={`select select-bordered select-sm list-none truncate ${className ?? "w-64"}`}>{summary}</summary>
      <ul className="dropdown-content menu border-base-300 z-30 mt-1 w-72 rounded-box border bg-[var(--color-surface-2)] p-2 shadow-xl">
        <li>
          <label className="label cursor-pointer justify-start gap-2">
            <input type="checkbox" className="checkbox checkbox-sm" checked={isAll} onChange={onClear} />
            {allLabel}
          </label>
        </li>
        {options.map((option) => (
          <li key={option.value}>
            <label className="label cursor-pointer justify-start gap-2">
              <input type="checkbox" className="checkbox checkbox-sm" checked={selected.has(option.value)} onChange={() => onToggle(option.value)} />
              {option.dotClassName && <span className={`h-2 w-2 shrink-0 rounded-full ${option.dotClassName}`} />}
              {option.label}
            </label>
          </li>
        ))}
      </ul>
    </details>
  );
}
