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
  menuClassName,
  wrapperClassName = "",
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  // Applied to the dropdown-content <ul> instead of `className`, for a
  // caller whose trigger and menu genuinely need different sizing (see
  // BoardSelect, whose trigger needs w-full to fill the sidebar row but
  // whose menu needs a fixed width instead — a percentage width there would
  // resolve against the positioning area set up below, not the trigger's
  // own rendered width). Defaults to `className` so every other caller
  // keeps sizing its menu exactly the same as its trigger.
  menuClassName?: string;
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
        // top-full left-0 right-auto bottom-auto: explicit, not left to
        // daisyUI 5's default CSS-anchor-positioning-based placement.
        // Measured that default directly against a real anchor-positioning
        // browser (Chromium): with no modifier class, .dropdown-content
        // anchors to the trigger's own right edge and top edge — a flyout
        // beside the trigger, not a menu below it — regardless of the
        // trigger's or menu's width. That's true for every caller of this
        // component, not just one; setting the insets directly here
        // overrides it for all of them at once. z-40, not the z-30 every
        // other menu/dropdown in this app uses: high enough that no
        // ordinary positioned card/section can ever paint over an open
        // menu's options and make them unclickable, while still staying
        // under the two intentional full-page overlays (CookieConsent,
        // LoadingOverlay both use z-50).
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
