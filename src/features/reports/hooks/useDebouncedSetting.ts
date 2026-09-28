"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_DELAY_MS = 500;

// Optimistic + debounced so rapid clicks collapse into one request instead
// of several that could resolve out of order. Failures roll back.
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
