"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "selectedBoard:v1";

// Fallback only: each page's ?board= URL param stays the source of truth.
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
