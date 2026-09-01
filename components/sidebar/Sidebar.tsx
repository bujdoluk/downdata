"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import SidebarNavLink from "@/components/sidebar/SidebarNavLink";
import BoardSelect from "@/components/sidebar/BoardSelect";
import Logo from "@/components/navbar/Logo";
import { ActivityIcon, AlertIcon, WrenchIcon, PlugIcon, HistoryIcon, RadarIcon, UserIcon } from "@/components/icons/NavIcons";
import { useCloseDetailsOnOutsideClick } from "@/hooks/useCloseDetailsOnOutsideClick";
import { fetchJson } from "@/lib/fetchJson";
import { queryKeys } from "@/lib/queryKeys";
import { createClient } from "@/lib/supabase/client";
import { logOut } from "@/lib/supabase/auth";
import { fetchAccount } from "@/lib/account";

const POLL_INTERVAL_MS = 60_000;

function ChevronIcon({ className, collapsed }: { className?: string; collapsed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={collapsed ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} />
    </svg>
  );
}

const STORAGE_KEY = "sidebarCollapsed:v2";

export default function Sidebar() {
  const { t } = useTranslation();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [supabase] = useState(() => createClient());
  const settingsRef = useRef<HTMLDetailsElement>(null);
  // Head-only count endpoints, not the full /api/incidents /
  // /api/maintenance payloads: the sidebar is mounted on every dashboard
  // page and polls every 60s, so pulling full incident/maintenance history
  // (with all update bodies) just to show a badge number drove most of
  // this app's Supabase egress.
  const { data: incidentsData } = useQuery({
    queryKey: queryKeys.incidents.count(),
    queryFn: () => fetchJson<{ count: number }>("/api/incidents/count", { cache: "no-store" }),
    refetchInterval: POLL_INTERVAL_MS,
  });
  const activeIncidentCount = incidentsData?.count ?? 0;
  const { data: maintenanceData } = useQuery({
    queryKey: queryKeys.maintenance.count(),
    queryFn: () => fetchJson<{ count: number }>("/api/maintenance/count", { cache: "no-store" }),
    refetchInterval: POLL_INTERVAL_MS,
  });
  const inProgressMaintenanceCount = maintenanceData?.count ?? 0;

  useCloseDetailsOnOutsideClick(settingsRef);

  // One-shot, not polled — the account menu only needs to reflect who's
  // signed in right now, not stay live-synced.
  const { data: account } = useQuery({
    queryKey: queryKeys.account(),
    queryFn: () => fetchAccount(supabase),
    staleTime: Infinity,
  });

  function closeSettingsMenu() {
    if (settingsRef.current) settingsRef.current.open = false;
  }

  async function handleLogout() {
    closeSettingsMenu();
    await logOut(supabase);
    router.push("/login");
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) === "true";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(saved);
    } catch {
      // ignore
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <aside
      className={`border-base-content/10 bg-[var(--color-sidebar)] sticky top-0 relative flex h-screen w-16 shrink-0 flex-col items-center border-r py-3 transition-[width] duration-200 ${
        collapsed ? "md:w-16 md:items-center md:py-3" : "md:w-60 md:items-stretch md:p-4"
      }`}
    >
      <Link
        href="/"
        className={`mb-4 flex w-full items-center justify-center gap-2 md:mb-6 ${collapsed ? "" : "md:justify-start"}`}
      >
        <Logo className="h-6 w-6 shrink-0" />
        {!collapsed && (
          <span className="hidden text-base font-semibold tracking-tight text-base-content md:inline">
            <span className="text-primary">down</span>DATA
          </span>
        )}
      </Link>

      <div className={`flex w-full flex-col items-center gap-4 ${collapsed ? "" : "md:items-stretch md:gap-3"}`}>
        <BoardSelect collapsed={collapsed} />
        <SidebarNavLink href="/monitors" icon={<ActivityIcon className="shrink-0" />} label={t("nav.monitors")} collapsed={collapsed} />
        <SidebarNavLink
          href="/incidents"
          icon={<AlertIcon className="shrink-0" />}
          label={t("nav.incidents")}
          collapsed={collapsed}
          badge={activeIncidentCount}
          badgeTitle={t("nav.incidentsBadgeTooltip")}
        />
        <SidebarNavLink
          href="/maintenance"
          icon={<WrenchIcon className="shrink-0" />}
          label={t("nav.maintenances")}
          collapsed={collapsed}
          badge={inProgressMaintenanceCount}
          badgeTitle={t("nav.maintenanceBadgeTooltip")}
        />
        <SidebarNavLink href="/integrations" icon={<PlugIcon className="shrink-0" />} label={t("nav.integrations")} collapsed={collapsed} />
        <SidebarNavLink href="/early-warnings" icon={<RadarIcon className="shrink-0" />} label={t("nav.earlyWarnings")} collapsed={collapsed} />
        <SidebarNavLink href="/history" icon={<HistoryIcon className="shrink-0" />} label={t("nav.history")} collapsed={collapsed} />
      </div>

      <div className="mt-auto flex w-full flex-col">
        <details ref={settingsRef} className="dropdown dropdown-top dropdown-start w-full">
          <summary
            title={account?.email ?? t("nav.settings")}
            className={`flex cursor-pointer list-none items-center justify-center gap-2 text-sm font-semibold tracking-wide uppercase text-base-content/40 transition-colors hover:text-base-content/70 ${
              collapsed ? "" : "md:justify-start"
            }`}
          >
            {account?.avatarUrl ? (
              <div className="avatar shrink-0">
                <div className="w-8 rounded-full">
                  {/* eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-host avatar URL; next/image's domain allowlist doesn't fit an arbitrary OAuth provider */}
                  <img src={account.avatarUrl} alt="" />
                </div>
              </div>
            ) : (
              <div className="avatar avatar-placeholder shrink-0">
                <div className="bg-neutral text-neutral-content w-7 rounded-full">
                  <UserIcon className="h-5 w-5" />
                </div>
              </div>
            )}
            {!collapsed && <span className="hidden truncate md:inline">{account?.email ?? t("nav.settings")}</span>}
          </summary>
          <ul className="dropdown-content menu menu-sm z-30 mt-2 w-40 rounded-box border border-base-300 bg-base-100 p-2 shadow-xl">
            <li>
              <Link href="/account" onClick={() => closeSettingsMenu()}>
                {t("nav.account")}
              </Link>
            </li>
            <li>
              <Link href="/billing" onClick={() => closeSettingsMenu()}>
                {t("nav.billing")}
              </Link>
            </li>
            <li>
              <button type="button" onClick={handleLogout}>
                {t("nav.logout")}
              </button>
            </li>
          </ul>
        </details>
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
        title={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
        className="btn btn-circle btn-sm border-base-content/10 bg-base-100 absolute top-1/2 -right-4 z-10 hidden -translate-y-1/2 border shadow-md md:flex"
      >
        <ChevronIcon collapsed={collapsed} />
      </button>
    </aside>
  );
}
