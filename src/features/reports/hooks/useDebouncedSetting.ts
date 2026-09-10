"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_DELAY_MS = 500;

// One field of /reports' settings panel: optimistic + debounced, not
// disabled-while-saving. `value` updates immediately on every set() call
// (no gap where a click looks like it didn't register), while the actual
// `save` call is delayed until `delayMs` after the *last* set() — a rapid
// run of clicks (Daily → Weekly → Monthly) collapses into one request for
// Monthly instead of three overlapping ones that could resolve out of
// order. A failed save rolls `value` back to the last confirmed
// (successfully saved) one and surfaces `error`; this component decides
// what "field" means to the caller (a single value, or a whole derived
// array like excludedBoardIds), so `save` always receives the full next
// value, not a diff.
export function useDebouncedSetting<T>(initialValue: T, save: (value: T) => Promise<T>, delayMs: number = DEFAULT_DELAY_MS) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const confirmedRef = useRef(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  function set(next: T) {
    setValue(next);
    setError(null);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      save(next)
        .then((confirmed) => {
          confirmedRef.current = confirmed;
          setValue(confirmed);
        })
        .catch((err: Error) => {
          setValue(confirmedRef.current);
          setError(err.message);
        });
    }, delayMs);
  }

  return { value, error, set };
}
