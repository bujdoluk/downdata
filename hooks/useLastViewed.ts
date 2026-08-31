"use client";

import { useEffect, useState } from "react";
import { nowMs } from "@/lib/formatTime";

// Read the timestamp of the previous visit; only overwrite it with "now"
// when markSeen is true. Generic over storageKey so each feature's "New"
// marker (incidents, Early Warnings, ...) gets its own independent
// timestamp — see lib/useIncidentsLastViewed.ts for the "viewing the list
// marks seen, viewing one detail item doesn't" reasoning this preserves.
export function useLastViewed(storageKey: string, markSeen: boolean): number {
  const [lastViewed, setLastViewed] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setLastViewed(Number(saved));
      if (markSeen) localStorage.setItem(storageKey, String(nowMs()));
    } catch {
      // ignore
    }
  }, [storageKey, markSeen]);

  return lastViewed;
}
