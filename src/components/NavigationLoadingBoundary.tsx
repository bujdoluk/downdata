"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import LoadingOverlay from "@/components/LoadingOverlay";

// One nav.* key per dashboard route's first path segment. A nested route
// (/boards/[id], /monitors/[slug]) has no name of its own, so it falls back
// to its parent section's name — naming it precisely would mean fetching
// the very data this overlay exists to cover the wait for.
const ROUTE_NAV_KEYS: Record<string, string> = {
  boards: "nav.boards",
  monitors: "nav.monitors",
  incidents: "nav.incidents",
  maintenance: "nav.maintenances",
  integrations: "nav.integrations",
  "status-pages": "nav.statusPages",
  "early-warnings": "nav.earlyWarnings",
  history: "nav.history",
  reports: "nav.reports",
  account: "nav.account",
  billing: "nav.billing",
  "add-service": "nav.addService",
};

function resolveNavKey(pathname: string): string | null {
  const segment = pathname.split("/").find(Boolean);
  return segment ? (ROUTE_NAV_KEYS[segment] ?? null) : null;
}

// A navigation shorter than this never shows anything — most dashboard
// navigations resolve well under this, and flashing an overlay for a
// handful of milliseconds reads as a glitch, not a loading state.
const SHOW_DELAY_MS = 300;
// Once shown, stays up at least this long even if the page finishes
// loading right after — the same flicker problem from the other end.
const MIN_VISIBLE_MS = 200;

// Shows one full-content-area loading overlay, named for the destination
// page, for the span of any dashboard-internal navigation — sidebar links
// and in-page links alike (e.g. a board card into /boards/[id]) — clicked
// anywhere inside this boundary, plus browser back/forward. A single
// click-capture listener here covers every entry point at once; the
// alternative (Next's per-link useLinkStatus) would need wiring into every
// individual <Link> in the app for the same result.
export default function NavigationLoadingBoundary({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [navKey, setNavKey] = useState<string | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Non-null while the overlay is visible, holding the timestamp it became
  // visible — the source of truth for "is it currently showing" instead of
  // the `visible` state itself, so the arrival effect below never has to
  // depend on (and re-fire from) `visible` changing.
  const shownAtRef = useRef<number | null>(null);

  const beginNavigation = useCallback((targetPath: string) => {
    const key = resolveNavKey(targetPath);
    if (!key) return;
    if (shownAtRef.current !== null) {
      // Already showing for an earlier still-unresolved navigation — point
      // it at the new destination instead of re-running the delay.
      setNavKey(key);
      return;
    }
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    showTimerRef.current = setTimeout(() => {
      showTimerRef.current = null;
      shownAtRef.current = Date.now();
      setNavKey(key);
      setVisible(true);
    }, SHOW_DELAY_MS);
  }, []);

  // Arrived — whatever navigation was pending is resolved. A show that
  // hadn't fired yet finished within the delay, so it never should have
  // flashed at all; a show that's already visible respects the minimum
  // visible time instead of snapping away early.
  useEffect(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (shownAtRef.current === null) return;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAtRef.current));
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      shownAtRef.current = null;
      setVisible(false);
    }, remaining);
  }, [pathname]);

  // Back/forward doesn't fire a click on anything, and the browser has
  // already changed the URL by the time this fires — read it straight from
  // the location instead of waiting on the click handler below.
  useEffect(() => {
    function handlePopState() {
      beginNavigation(window.location.pathname);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [beginNavigation]);

  // Unmounts practically never (this wraps the whole dashboard shell), but
  // don't leave timers firing into a gone component regardless.
  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    // Same checks a browser itself uses to decide "open in a new tab" vs.
    // a normal same-tab navigation — don't show a loading state for a
    // click that isn't actually navigating this tab.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
    const href = anchor.getAttribute("href");
    if (!href || !href.startsWith("/")) return;
    const url = new URL(href, window.location.origin);
    // Only the path changing counts as "a different page" — a link that
    // just rewrites the query string (History's service picker, board
    // filters, etc.) isn't a navigation this overlay should cover.
    if (url.pathname === pathname) return;
    beginNavigation(url.pathname);
  }

  return (
    <div className="flex flex-1" onClickCapture={handleClickCapture}>
      {sidebar}
      <div className="relative flex flex-1">
        {children}
        {visible && navKey && <LoadingOverlay label={t("nav.loadingPage", { page: t(navKey) })} contained />}
      </div>
    </div>
  );
}
