"use client";

import { useCallback, useSyncExternalStore } from "react";
import { onServicesChanged } from "@/lib/servicesChanged";

const POLL_INTERVAL_MS = 60_000;

type State<T> = { data: T | null; error: boolean };

type Entry = {
  state: State<unknown>;
  listeners: Set<() => void>;
  intervalId: ReturnType<typeof setInterval> | null;
  unsubscribeServicesChanged: (() => void) | null;
  inFlight: Promise<void> | null;
  pendingCleanup: ReturnType<typeof setTimeout> | null;
};

// One entry per URL, shared across every component polling it — this is
// what actually fixes the duplicate-fetch problem: previously each
// usePolledFetch call had its own useState + its own useEffect + its own
// setInterval, so e.g. Sidebar's badge count and a page's own content both
// independently polling "/api/maintenance" meant two live intervals and
// two real HTTP requests for the same data. Now there's one interval and
// one in-flight request per URL no matter how many components ask for it.
const entries = new Map<string, Entry>();

// Stable reference (not a fresh object per call) — required so
// useSyncExternalStore doesn't see a "changed" server snapshot on every
// render and warn/loop. Matches the pre-hydration state useState(null)
// used to render before its first client-side fetch resolved.
const EMPTY_STATE: State<unknown> = { data: null, error: false };

function getEntry(url: string): Entry {
  let entry = entries.get(url);
  if (!entry) {
    entry = {
      state: EMPTY_STATE,
      listeners: new Set(),
      intervalId: null,
      unsubscribeServicesChanged: null,
      inFlight: null,
      pendingCleanup: null,
    };
    entries.set(url, entry);
  }
  return entry;
}

function notify(entry: Entry) {
  for (const listener of entry.listeners) listener();
}

function poll(url: string, entry: Entry): Promise<void> {
  // De-dupe: if a fetch for this URL is already in flight (e.g. two
  // components both mounting in the same tick, or a scheduled tick
  // overlapping a services-changed refresh), share that one request
  // instead of firing a second.
  if (entry.inFlight) return entry.inFlight;

  entry.inFlight = (async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("bad response");
      entry.state = { data: await res.json(), error: false };
    } catch {
      entry.state = { ...entry.state, error: true };
    } finally {
      entry.inFlight = null;
      notify(entry);
    }
  })();

  return entry.inFlight;
}

function startPolling(url: string, entry: Entry) {
  poll(url, entry);
  entry.intervalId = setInterval(() => poll(url, entry), POLL_INTERVAL_MS);
  entry.unsubscribeServicesChanged = onServicesChanged(() => poll(url, entry));
}

function stopPolling(entry: Entry) {
  if (entry.intervalId) clearInterval(entry.intervalId);
  entry.unsubscribeServicesChanged?.();
  entry.intervalId = null;
  entry.unsubscribeServicesChanged = null;
}

function subscribe(url: string, listener: () => void): () => void {
  const entry = getEntry(url);
  entry.listeners.add(listener);

  if (entry.pendingCleanup) {
    // A teardown from a listener that left moments ago (most commonly
    // React StrictMode's synchronous mount→cleanup→mount in dev) hadn't
    // actually run yet — cancel it and keep the existing poll cycle
    // going instead of tearing it down and immediately rebuilding it,
    // which would otherwise double every fetch.
    clearTimeout(entry.pendingCleanup);
    entry.pendingCleanup = null;
  } else if (entry.intervalId === null) {
    startPolling(url, entry);
  }

  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size === 0) {
      entry.pendingCleanup = setTimeout(() => {
        entry.pendingCleanup = null;
        if (entry.listeners.size === 0) {
          stopPolling(entry);
          entries.delete(url);
        }
      }, 0);
    }
  };
}

function getSnapshot(url: string): State<unknown> {
  return getEntry(url).state;
}

export function usePolledFetch<T>(url: string): State<T> {
  // Memoized per url, not fresh closures every render — the pattern
  // useSyncExternalStore's own docs recommend for a parameterized store,
  // so it only actually resubscribes when url changes, not on every render.
  const subscribeToUrl = useCallback((listener: () => void) => subscribe(url, listener), [url]);
  const getUrlSnapshot = useCallback(() => getSnapshot(url) as State<T>, [url]);
  const getServerSnapshot = useCallback(() => EMPTY_STATE as State<T>, []);

  return useSyncExternalStore(subscribeToUrl, getUrlSnapshot, getServerSnapshot);
}
