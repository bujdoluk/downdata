"use client";

import { useLastViewed } from "@/hooks/useLastViewed";

const STORAGE_KEY = "incidentsLastViewed";

// Only the list marks seen; detail views just read, so opening one incident doesn't clear others' "New".
export function useIncidentsLastViewed(markSeen: boolean): number {
  return useLastViewed(STORAGE_KEY, markSeen);
}
