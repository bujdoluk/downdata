"use client";

import { useRef, type ReactNode } from "react";
import { useCloseDetailsOnOutsideClick } from "@/hooks/useCloseDetailsOnOutsideClick";

// For filters that need hovered options highlighted, which a native <select>
// popup can't style. Use a native <select> anywhere else.
export default function SelectDropdown<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  menuClassName,
  wrapperClassName = "",
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  // For a menu sized differently from its trigger; a percentage width here
  // resolves against the positioning area, not the trigger. Defaults to `className`.
  menuClassName?: string;
  // Visibility/layout of the outer <details>, independent of trigger/list sizing.
  wrapperClassName?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useCloseDetailsOnOutsideClick(detailsRef);

  const current = options.find((option) => option.value === value);

  function handleSelect(next: T) {
    onChange(next);
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details ref={detailsRef} className={`dropdown ${wrapperClassName}`}>
      <summary className={`select select-bordered select-sm list-none truncate ${className}`} aria-label={ariaLabel}>
        {current?.label ?? value}
      </summary>
      <ul
        // Explicit insets: daisyUI 5's anchor positioning otherwise opens a flyout
        // beside the trigger. z-40 sits above cards but below z-50 full-page overlays.
        className={`dropdown-content menu menu-sm border-base-300 z-40 mt-1 max-h-64 flex-nowrap overflow-y-auto rounded-box border bg-[var(--color-surface-2)] p-1 shadow-xl top-full right-auto bottom-auto left-0 ${menuClassName ?? className}`}
      >
        {options.map((option) => (
          <li key={option.value}>
            <button type="button" onClick={() => handleSelect(option.value)}>
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
