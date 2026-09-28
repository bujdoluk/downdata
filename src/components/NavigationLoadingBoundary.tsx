"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import LoadingOverlay from "@/components/LoadingOverlay";

// Nested routes fall back to their parent section's name; naming them precisely
// would mean fetching the very data this overlay covers the wait for.
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
};

function resolveNavKey(pathname: string): string | null {
  const segment = pathname.split("/").find(Boolean);
  return segment ? (ROUTE_NAV_KEYS[segment] ?? null) : null;
}

// Delay and minimum visible time both avoid a flash that reads as a glitch.
const SHOW_DELAY_MS = 300;
const MIN_VISIBLE_MS = 200;

// One click-capture listener covers every link at once; per-link useLinkStatus
// would need wiring into every <Link> in the app.
export default function NavigationLoadingBoundary({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [navKey, setNavKey] = useState<string | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Source of truth for "is showing" instead of `visible`, so the arrival
  // effect never depends on (and re-fires from) `visible` changing.
  const shownAtRef = useRef<number | null>(null);

  const beginNavigation = useCallback((targetPath: string) => {
    const key = resolveNavKey(targetPath);
    if (!key) return;
    if (shownAtRef.current !== null) {
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

  // Back/forward fires no click, and the URL has already changed by now.
  useEffect(() => {
    function handlePopState() {
      beginNavigation(window.location.pathname);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [beginNavigation]);

  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    // Skip clicks that open a new tab instead of navigating this one.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
    const href = anchor.getAttribute("href");
    if (!href || !href.startsWith("/")) return;
    const url = new URL(href, window.location.origin);
    // Query-string-only changes (filters, pickers) aren't a page navigation.
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
