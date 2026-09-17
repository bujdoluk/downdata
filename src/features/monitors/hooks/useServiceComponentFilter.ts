"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchJson, requestJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const SAVE_DEBOUNCE_MS = 600;

// Exported for unit testing (this repo has no component/hook-rendering
// test setup — see resolveReminderRule.ts/notifyIncidentEvents.ts for the
// same reasoning applied elsewhere: extract the pure logic, test that
// directly instead of the hook itself).
export function sameIds(a: Set<string>, b: string[] | null): boolean {
  if (b === null) return false;
  if (a.size !== b.length) return false;
  return b.every((id) => a.has(id));
}

// Content comparison, not reference — TanStack Query hands back a new
// array instance on every fetch (including a same-content background
// refetch triggered by window refocus, which this app's QueryClient does
// on its default settings), so comparing `data.componentIds !== syncedFrom`
// by reference would treat "nothing actually changed" as "resync now" on
// every such refetch. undefined means "never synced yet" — always treated
// as different so the very first sync still happens.
export function sameServerValue(a: string[] | null, b: string[] | null | undefined): boolean {
  if (b === undefined) return false;
  if (a === null || b === null) return a === b;
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((id) => setA.has(id));
}

// One shared "All components"/"Custom" allowlist per (account, service) —
// see docs/specs/SPEC-component-notification-filters.md. Drives both the
// mode toggle row and the per-component checkboxes rendered inline in
// ServiceDetail's existing Components tab list; extracted as a hook
// (rather than a self-contained component, unlike this app's usual
// "own its own useQuery" widgets) because its state has to reach two
// different, separately-rendered regions of that tab, not one contiguous
// widget.
export function useServiceComponentFilter(slug: string, allComponentIds: string[]) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.monitors.componentFilter(slug);
  const apiPath = `/api/monitors/${slug}/component-filter`;

  // Services with zero selectable components never render anything that
  // reads this hook's return value at all (ServiceDetail.tsx gates the
  // whole mode-toggle/checklist UI on componentOptions.length > 0) — enabled
  // avoids firing a GET (and a session-scoped Supabase query behind it) on
  // every such page view for a result nothing will ever use.
  const { data } = useQuery({
    queryKey,
    queryFn: () => fetchJson<{ componentIds: string[] | null }>(apiPath),
    enabled: allComponentIds.length > 0,
  });

  // Local editable copy of the saved allowlist, reconciled against the
  // server value during render rather than in a useEffect (the "adjust
  // state during render" recipe — react-hooks/set-state-in-effect would
  // reject a useEffect doing this; see AGENTS.md's Failure log on
  // BoardDetailContent's own reactive-state pattern for the same
  // reasoning). `syncedFrom` tracks which server value local state was
  // last derived from, so a background refetch only resets in-progress
  // edits when the server value genuinely changed underneath them.
  const [syncedFrom, setSyncedFrom] = useState<string[] | null | undefined>(undefined);
  const [mode, setMode] = useState<"all" | "custom">("all");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  // Only true once the account has actually toggled a checkbox this
  // session — guards the save effect below so switching to "Custom" alone
  // (which seeds `checked` empty — see chooseCustom's own comment) never
  // fires a save on its own; only an actual check/uncheck does. Also
  // guards the sync block below: this app's QueryClient refetches on
  // window focus by default (nothing overrides it), so alt-tabbing away
  // and back while an edit is still unsaved must not let that refetch
  // clobber it — resetting hasEdited to false (via commitIfCurrent below)
  // is what lets syncing resume once a save actually completes.
  const [hasEdited, setHasEdited] = useState(false);

  // A saved id that no longer exists on the service's current live
  // component list (the provider renamed/removed it since the filter was
  // saved) is never filtered out of `checked` here — it's harmless while
  // sitting in local state, since ServiceDetail.tsx only ever renders a
  // checkbox for a component that's actually in `allComponentIds`, so a
  // stale id has no checkbox and can't be interacted with either way.
  // Filtering it out *here* instead would risk a real race: this sync can
  // run before ServiceDetail's own live-component fetch has resolved, at
  // which point `allComponentIds` is still `[]` — filtering against an
  // empty list would wrongly discard a completely valid saved selection,
  // not just a genuinely stale one. The debounced save effect below does
  // the filtering instead, at the point it's actually needed (about to
  // submit), using whichever `allComponentIds` is current at that moment
  // — by then the UI wouldn't be showing interactive checkboxes at all
  // unless that list had already loaded for real.
  if (data && !hasEdited && !sameServerValue(data.componentIds, syncedFrom)) {
    setSyncedFrom(data.componentIds);
    setMode(data.componentIds === null ? "all" : "custom");
    setChecked(new Set(data.componentIds ?? allComponentIds));
  }

  const debouncedChecked = useDebouncedValue(checked, SAVE_DEBOUNCE_MS);

  const saveMutation = useMutation({
    mutationFn: (componentIds: string[]) => requestJson(apiPath, t("serviceDetail.componentFilterSaveError"), { method: "PUT", body: { componentIds } }),
  });

  const clearMutation = useMutation({
    mutationFn: () => requestJson(apiPath, t("serviceDetail.componentFilterSaveError"), { method: "DELETE" }),
  });

  // Both mutations fire fire-and-forget (chooseAll's clear, the debounced
  // save effect's save) — a quick "All" → "Custom" → check-a-box sequence
  // can have both in flight at once, racing. actionSeqRef.current is
  // bumped on every one of those three actions; each mutation call is
  // stamped with the sequence value at the moment it was fired, and its
  // completion handler only actually applies (resets hasEdited, refetches)
  // if that value is still current — an older action's response, arriving
  // after a newer one has already superseded it, is silently ignored
  // instead of clobbering whatever the newer action already put in place.
  const actionSeqRef = useRef(0);

  function commitIfCurrent(seq: number) {
    if (actionSeqRef.current !== seq) return;
    setHasEdited(false);
    queryClient.invalidateQueries({ queryKey });
  }

  // A failed save/clear previously left mode/checked showing the attempted
  // (never-persisted) change forever — chooseAll/chooseCustom set them
  // optimistically before the request resolves, and nothing reverted them
  // on failure. The render-time sync block above can't do this on its own:
  // it only re-syncs when the *server* value changes, and a failed write
  // means the server value never moved, so `sameServerValue` still reads
  // "unchanged" even though local state has drifted from it. Reverts to
  // whatever syncedFrom actually represents — the last real server value —
  // same seq-guard as commitIfCurrent, so a stale failure can't stomp on a
  // newer, still-in-flight action.
  function revertIfCurrent(seq: number) {
    if (actionSeqRef.current !== seq) return;
    setMode(syncedFrom === null || syncedFrom === undefined ? "all" : "custom");
    setChecked(new Set(syncedFrom ?? allComponentIds));
    setHasEdited(false);
  }

  // Fires once the debounced set settles — not on every keystroke/click —
  // and only once the account has actually edited something and at least
  // one component is still checked (never save an empty Custom selection).
  // Filters against the *current* allComponentIds right before sending —
  // see the render-time sync block's own comment for why filtering happens
  // here and not there. A stale id dropped this way is also naturally
  // dropped server-side, since a save always replaces the full stored set.
  useEffect(() => {
    if (!hasEdited || mode !== "custom" || debouncedChecked.size === 0) return;
    if (sameIds(debouncedChecked, syncedFrom ?? null)) return;
    const validIds = [...debouncedChecked].filter((id) => allComponentIds.includes(id));
    if (validIds.length === 0) return;
    const seq = ++actionSeqRef.current;
    saveMutation.mutate(validIds, { onSuccess: () => commitIfCurrent(seq), onError: () => revertIfCurrent(seq) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saveMutation/syncedFrom/commitIfCurrent are stable-enough refs for this effect's purpose; including the mutation object itself would re-fire on every render since TanStack Query returns a new object each render.
  }, [debouncedChecked, hasEdited, mode, allComponentIds]);

  function chooseAll() {
    if (mode === "all") return; // matches chooseCustom's own no-op guard — clicking an already-checked option shouldn't re-fire a DELETE
    const seq = ++actionSeqRef.current;
    setMode("all");
    setHasEdited(false);
    clearMutation.mutate(undefined, { onSuccess: () => commitIfCurrent(seq), onError: () => revertIfCurrent(seq) });
  }

  function chooseCustom() {
    if (mode === "custom") return;
    ++actionSeqRef.current; // supersedes any still-in-flight chooseAll() clear
    setMode("custom");
    // Starts empty, not pre-checked with every component — with 200+
    // components, starting "all checked" means unchecking ~195 of them to
    // narrow down to a few, which is exactly the bad UX this feature
    // exists to avoid. The account checks the handful they actually want.
    setChecked(new Set());
    setHasEdited(false);
  }

  function toggleComponent(id: string) {
    setChecked((prev) => {
      const isChecking = !prev.has(id);
      if (!isChecking && prev.size === 1) return prev; // blocked — see mustKeepOneWarning below
      const next = new Set(prev);
      if (isChecking) next.add(id);
      else next.delete(id);
      return next;
    });
    setHasEdited(true);
  }

  // Surfaced so the UI can show a real error instead of a save silently
  // failing with no visible sign anything went wrong (e.g. the server
  // rejecting a submitted id that no longer exists upstream).
  const saveError = saveMutation.error instanceof Error ? saveMutation.error.message : clearMutation.error instanceof Error ? clearMutation.error.message : null;

  return {
    mode,
    checked,
    chooseAll,
    chooseCustom,
    toggleComponent,
    saveError,
    // Only once exactly one is checked — that's the point where
    // toggleComponent's own block actually kicks in. Showing this the
    // instant Custom is entered (0 checked) would read as an alarm before
    // the account has done anything; an empty checklist is self-explanatory
    // on its own.
    mustKeepOneWarning: mode === "custom" && checked.size === 1,
  };
}
