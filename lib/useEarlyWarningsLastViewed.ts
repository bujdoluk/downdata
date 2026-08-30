"use client";

import { useLastViewed } from "@/lib/useLastViewed";

const STORAGE_KEY = "earlyWarningsLastViewed";

export function useEarlyWarningsLastViewed(markSeen: boolean): number {
  return useLastViewed(STORAGE_KEY, markSeen);
}
