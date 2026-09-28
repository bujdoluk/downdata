import { useState } from "react";

function sameMembers(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item) => b.includes(item));
}

export function useImpactToggle(initial: string[], onUpdateImpacts: (impacts: string[]) => void) {
  const [impacts, setImpacts] = useState<Set<string>>(new Set(initial));
  // Compared by value: callers pass a fresh array literal every render.
  const [syncedFrom, setSyncedFrom] = useState(initial);

  // The dialogs stay mounted, so `initial` changes after mount (e.g. reconnect).
  // Re-sync during render, not in an effect, to avoid a stale flash.
  if (!sameMembers(syncedFrom, initial)) {
    setSyncedFrom(initial);
    setImpacts(new Set(initial));
  }

  // Not a setState updater: the PATCH side effect would fire twice under StrictMode.
  function toggleImpact(impact: string) {
    const next = new Set(impacts);
    if (next.has(impact)) next.delete(impact);
    else next.add(impact);
    setImpacts(next);
    onUpdateImpacts([...next]);
  }

  return { impacts, toggleImpact };
}
