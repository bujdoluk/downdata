"use client";

import { useLastViewed } from "@/hooks/useLastViewed";

const STORAGE_KEY = "incidentsLastViewed";

// The Incidents list marks seen (viewing the list is what clears "New");
// Incident Detail only reads it — opening one incident shouldn't reset the
// marker and wrongly clear the New badge on an unrelated incident back on
// the list.
export function useIncidentsLastViewed(markSeen: boolean): number {
  return useLastViewed(STORAGE_KEY, markSeen);
}
