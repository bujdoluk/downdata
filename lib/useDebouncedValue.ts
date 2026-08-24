"use client";

import { useEffect, useState } from "react";

// Generic value debounce — returns `value` again only after it's stopped
// changing for `delayMs`. Any change (including a new object/Set reference)
// restarts the timer, since useEffect's cleanup clears the previous one.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
