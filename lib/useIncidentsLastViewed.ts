"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "incidentsLastViewed";

// Read the timestamp of the previous visit; only overwrite it with "now"
// when markSeen is true. The Incidents list marks seen (viewing the list
// is what clears "New"); Incident Detail only reads it — opening one
// incident shouldn't reset the marker and wrongly clear the New badge on
// an unrelated incident back on the list.
export function useIncidentsLastViewed(markSeen: boolean): number {
  const [lastViewed, setLastViewed] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setLastViewed(Number(saved));
      if (markSeen) localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }, [markSeen]);

  return lastViewed;
}
