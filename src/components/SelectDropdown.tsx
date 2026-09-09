"use client";

import { useRef, type ReactNode } from "react";
import { useCloseDetailsOnOutsideClick } from "@/hooks/useCloseDetailsOnOutsideClick";

// daisyUI-styled stand-in for a plain <select> — for filters where hovering
// an open option actually needs to highlight, which a native <select>'s
// <option> popup can never do (no browser exposes that hover state to
// author CSS, on any OS). Same details+menu idiom already used by
// ImpactFilterDropdown/ComponentFilterDropdown/LanguageSwitcher/
// TimeZonePicker, generalized for "pick exactly one value, close on pick."
// Not a replacement for those — a plain native <select> is still the right
// call anywhere this hover need doesn't apply.
export default function SelectDropdown<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  wrapperClassName = "",
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  // Applied to the outer <details> alongside "dropdown" — separate from
  // `className` (summary + list width/sizing) because a caller sometimes
  // needs to control the dropdown's own visibility/layout (e.g.
  // BoardSelect's "hidden below md, inline-flex at md+" responsive rule),
  // which has nothing to do with how wide the trigger/list render.
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
        className={`dropdown-content menu menu-sm border-base-300 z-30 mt-1 max-h-64 flex-nowrap overflow-y-auto rounded-box border bg-[var(--color-surface-2)] p-1 shadow-xl ${className}`}
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
