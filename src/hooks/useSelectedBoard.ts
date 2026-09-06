"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "selectedBoard:v1";

// The one persisted "which board am I looking at" default, shared by the
// sidebar's BoardSelect and every board-aware page (Monitors/Incidents/
// Maintenance/History) — each page's own ?board= URL param stays its real,
// live source of truth; this is only the fallback applied once when that
// param is absent, and the value written back to when it changes. See
// components/sidebar/BoardSelect.tsx for how the sidebar keeps this in sync
// with the current pathname too.
export function useSelectedBoard() {
  const [selectedBoardId, setSelectedBoardIdState] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setSelectedBoardIdState(saved);
    } catch {
      // ignore
    }
  }, []);

  function setSelectedBoardId(id: string) {
    setSelectedBoardIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return { selectedBoardId, setSelectedBoardId };
}
