"use client";

import { useEffect, useState } from "react";

export function usePinned(storageKey: string) {
  const [pinned, setPinned] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setPinned(new Set(JSON.parse(saved)));
    } catch {
      // ignore
    }
  }, [storageKey]);

  function togglePin(id: string) {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }

  return { pinned, togglePin };
}
