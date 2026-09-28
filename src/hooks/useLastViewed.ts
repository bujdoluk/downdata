"use client";

import { useEffect, useState } from "react";
import { nowMs } from "@/lib/formatTime";

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
