"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchJson, requestJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const SAVE_DEBOUNCE_MS = 600;

// Exported for unit tests; there's no hook-rendering test setup.
export function sameIds(a: Set<string>, b: string[] | null): boolean {
  if (b === null) return false;
  if (a.size !== b.length) return false;
  return b.every((id) => a.has(id));
}

// Compares content, not reference: every refetch returns a new array.
// undefined means "never synced", so the first sync always happens.
export function sameServerValue(a: string[] | null, b: string[] | null | undefined): boolean {
  if (b === undefined) return false;
  if (a === null || b === null) return a === b;
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((id) => setA.has(id));
}

// A hook, not a component, because its state feeds two separate regions of
// the Components tab. See docs/specs/SPEC-component-notification-filters.md.
export function useServiceComponentFilter(slug: string, allComponentIds: string[]) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.monitors.componentFilter(slug);
  const apiPath = `/api/monitors/${slug}/component-filter`;

  // Skip the fetch with no components; nothing would render the result.
  const { data } = useQuery({
    queryKey,
    queryFn: () => fetchJson<{ componentIds: string[] | null }>(apiPath),
    enabled: allComponentIds.length > 0,
  });

  // Synced during render, not in an effect (react-hooks/set-state-in-effect).
  // syncedFrom lets a refetch reset local state only if the server value changed.
  const [syncedFrom, setSyncedFrom] = useState<string[] | null | undefined>(undefined);
  const [mode, setMode] = useState<"all" | "custom">("all");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  // Stops a bare switch to Custom from saving, and a focus refetch from
  // clobbering unsaved edits. commitIfCurrent resets it after a save.
  const [hasEdited, setHasEdited] = useState(false);

  // Stale ids aren't filtered here: allComponentIds may still be [] before the
  // live fetch resolves, which would wipe a valid selection. Saving filters them.
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

  // Save and clear can race; each call is stamped with a sequence number and
  // only the latest action's response is applied.
  const actionSeqRef = useRef(0);

  function commitIfCurrent(seq: number) {
    if (actionSeqRef.current !== seq) return;
    setHasEdited(false);
    queryClient.invalidateQueries({ queryKey });
  }

  // Undoes the optimistic update on failure; the sync block can't, since the
  // server value never moved.
  function revertIfCurrent(seq: number) {
    if (actionSeqRef.current !== seq) return;
    setMode(syncedFrom === null || syncedFrom === undefined ? "all" : "custom");
    setChecked(new Set(syncedFrom ?? allComponentIds));
    setHasEdited(false);
  }

  // Never saves an empty Custom selection. Stale ids are dropped here, against
  // the now-loaded allComponentIds.
  useEffect(() => {
    if (!hasEdited || mode !== "custom" || debouncedChecked.size === 0) return;
    if (sameIds(debouncedChecked, syncedFrom ?? null)) return;
    const validIds = [...debouncedChecked].filter((id) => allComponentIds.includes(id));
    if (validIds.length === 0) return;
    const seq = ++actionSeqRef.current;
    saveMutation.mutate(validIds, { onSuccess: () => commitIfCurrent(seq), onError: () => revertIfCurrent(seq) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the mutation object is new every render and would re-fire this effect
  }, [debouncedChecked, hasEdited, mode, allComponentIds]);

  function chooseAll() {
    if (mode === "all") return;
    const seq = ++actionSeqRef.current;
    setMode("all");
    setHasEdited(false);
    clearMutation.mutate(undefined, { onSuccess: () => commitIfCurrent(seq), onError: () => revertIfCurrent(seq) });
  }

  function chooseCustom() {
    if (mode === "custom") return;
    ++actionSeqRef.current; // supersedes any in-flight chooseAll() clear
    setMode("custom");
    // Starts empty: with 200+ components, unchecking down to a few is painful.
    setChecked(new Set());
    setHasEdited(false);
  }

  function toggleComponent(id: string) {
    setChecked((prev) => {
      const isChecking = !prev.has(id);
      if (!isChecking && prev.size === 1) return prev;
      const next = new Set(prev);
      if (isChecking) next.add(id);
      else next.delete(id);
      return next;
    });
    setHasEdited(true);
  }

  const saveError = saveMutation.error instanceof Error ? saveMutation.error.message : clearMutation.error instanceof Error ? clearMutation.error.message : null;

  return {
    mode,
    checked,
    chooseAll,
    chooseCustom,
    toggleComponent,
    saveError,
    // Not at 0 checked: an empty list on entering Custom isn't an error.
    mustKeepOneWarning: mode === "custom" && checked.size === 1,
  };
}
