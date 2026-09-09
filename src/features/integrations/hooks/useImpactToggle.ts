import { useState } from "react";

function sameMembers(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item) => b.includes(item));
}

// Shared by SmsConnectForm and WebhookConnectForm — both keep a local Set
// of selected severities mirroring the integration's own notifyImpacts,
// toggle one at a time, and push the whole new list up on every change.
// Was copy-pasted identically into both before this extraction.
export function useImpactToggle(initial: string[], onUpdateImpacts: (impacts: string[]) => void) {
  const [impacts, setImpacts] = useState<Set<string>>(new Set(initial));
  // Tracks which `initial` value `impacts` was last synced from — compared
  // by value below, since the caller's own `notifyImpacts ?? [...]`
  // fallback is a new array literal every render, not a stable reference.
  const [syncedFrom, setSyncedFrom] = useState(initial);

  // The connect dialogs that render this stay mounted for the whole page
  // session (shown/hidden via <dialog> showModal()/close(), never
  // conditionally rendered — see IntegrationsPageContent), so `initial` can
  // change out from under this state well after mount: disconnecting and
  // reconnecting the integration resets its saved notify_impacts to a
  // fresh default row, but a plain `useState(initial)` only reads its
  // initializer once and never re-syncs on its own. Without this, the
  // checkboxes kept showing whatever was selected before the disconnect,
  // and toggling one from there computed the next full list from that
  // stale base instead of the row's actual new default — silently saving
  // the wrong severities. Adjusting state during render (not in a
  // useEffect) so the corrected value is what actually paints, with no
  // extra render or flash of the stale one — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  if (!sameMembers(syncedFrom, initial)) {
    setSyncedFrom(initial);
    setImpacts(new Set(initial));
  }

  // Computed from the current `impacts` closure, not a setState updater
  // callback — a checkbox click can't fire faster than a re-render here, so
  // there's no real risk of a stale read, and the side effect
  // (onUpdateImpacts, a real PATCH request) stays outside the updater.
  // React is explicit that updaters must be pure; calling a side effect
  // from inside one is exactly the kind of thing StrictMode's deliberate
  // double-invocation exists to catch, and it would have fired the PATCH
  // twice per click.
  function toggleImpact(impact: string) {
    const next = new Set(impacts);
    if (next.has(impact)) next.delete(impact);
    else next.add(impact);
    setImpacts(next);
    onUpdateImpacts([...next]);
  }

  return { impacts, toggleImpact };
}
