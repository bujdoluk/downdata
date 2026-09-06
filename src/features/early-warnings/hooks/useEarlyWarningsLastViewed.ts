"use client";

import { useLastViewed } from "@/hooks/useLastViewed";

const STORAGE_KEY = "earlyWarningsLastViewed";

export function useEarlyWarningsLastViewed(markSeen: boolean): number {
  return useLastViewed(STORAGE_KEY, markSeen);
}
