"use client";

import { useEffect, type RefObject } from "react";

// Default behavior mutates the <details> element directly (uncontrolled).
// Pass onOutsideClick for a controlled <details> instead (e.g. one that
// also needs to close itself from elsewhere, like after a successful
// form submit) — same outside-click detection either way, just a
// different closing mechanism.
export function useCloseDetailsOnOutsideClick(ref: RefObject<HTMLDetailsElement | null>, onOutsideClick?: () => void) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      if (onOutsideClick) onOutsideClick();
      else ref.current.open = false;
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, onOutsideClick]);
}
