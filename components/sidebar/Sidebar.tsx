"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import SidebarNavLink from "@/components/sidebar/SidebarNavLink";
import Logo from "@/components/navbar/Logo";
import LanguageSwitcher from "@/components/navbar/LanguageSwitcher";
import ThemeToggle from "@/components/navbar/ThemeToggle";
import { GearIcon, GridIcon, ActivityIcon, AlertIcon, WrenchIcon, PlugIcon } from "@/components/icons/NavIcons";
import { useCloseDetailsOnOutsideClick } from "@/lib/useCloseDetailsOnOutsideClick";
import { usePolledFetch } from "@/lib/usePolledFetch";
import { isActiveIncident } from "@/lib/isActiveIncident";
import { isInProgressMaintenance } from "@/lib/isInProgressMaintenance";
import type { TrackedIncident, TrackedMaintenance } from "@/types/service";

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
  const [collapsed, setCollapsed] = useState(false);
  const settingsRef = useRef<HTMLDetailsElement>(null);
  const preferencesRef = useRef<HTMLDialogElement>(null);
  const { data: incidentsData } = usePolledFetch<{ incidents: TrackedIncident[] }>("/api/incidents");
  const activeIncidentCount = useMemo(
    () => incidentsData?.incidents.filter(isActiveIncident).length ?? 0,
    [incidentsData],
  );
  const { data: maintenanceData } = usePolledFetch<{ maintenances: TrackedMaintenance[] }>("/api/maintenance");
  const inProgressMaintenanceCount = useMemo(
    () => maintenanceData?.maintenances.filter(isInProgressMaintenance).length ?? 0,
    [maintenanceData],
  );

  useCloseDetailsOnOutsideClick(settingsRef);

  function openPreferences() {
    if (settingsRef.current) settingsRef.current.open = false;
    preferencesRef.current?.showModal();
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
      className={`border-base-content/10 bg-[var(--color-sidebar)] sticky top-0 relative flex h-screen w-20 shrink-0 flex-col items-center border-r py-3 transition-[width] duration-200 ${
        collapsed ? "md:w-20 md:items-center md:py-3" : "md:w-60 md:items-stretch md:p-4"
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
        <SidebarNavLink href="/" icon={<GridIcon className="shrink-0" />} label={t("nav.services")} collapsed={collapsed} />
        <SidebarNavLink
          href="/incidents"
          icon={<AlertIcon className="shrink-0" />}
          label={t("nav.incidents")}
          collapsed={collapsed}
          badge={activeIncidentCount}
        />
        <SidebarNavLink
          href="/maintenance"
          icon={<WrenchIcon className="shrink-0" />}
          label={t("nav.maintenances")}
          collapsed={collapsed}
          badge={inProgressMaintenanceCount}
        />
        <SidebarNavLink href="/monitors" icon={<ActivityIcon className="shrink-0" />} label={t("nav.monitors")} collapsed={collapsed} />
        <SidebarNavLink href="/integrations" icon={<PlugIcon className="shrink-0" />} label={t("nav.integrations")} collapsed={collapsed} />
      </div>

      <div className="mt-auto flex w-full flex-col">
        <details ref={settingsRef} className="dropdown dropdown-top dropdown-start w-full">
          <summary
            title={t("nav.settings")}
            className={`flex cursor-pointer list-none items-center justify-center gap-2 text-sm font-semibold tracking-wide uppercase text-base-content/40 transition-colors hover:text-base-content/70 ${
              collapsed ? "" : "md:justify-start"
            }`}
          >
            <GearIcon className="shrink-0" />
            {!collapsed && <span className="hidden md:inline">{t("nav.settings")}</span>}
          </summary>
          <ul className="dropdown-content menu menu-sm z-30 mt-2 w-40 rounded-box border border-base-300 bg-base-100 p-2 shadow-xl">
            <li>
              <button type="button" onClick={openPreferences}>
                {t("nav.preferences")}
              </button>
            </li>
          </ul>
        </details>
      </div>

      <dialog ref={preferencesRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">{t("nav.preferences")}</h3>

          <div className="mt-4">
            <h4 className="text-xs font-semibold tracking-wide text-base-content/60 uppercase">{t("nav.theme")}</h4>
            <div className="mt-2">
              <ThemeToggle />
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-xs font-semibold tracking-wide text-base-content/60 uppercase">{t("nav.language")}</h4>
            <div className="mt-2">
              <LanguageSwitcher inline />
            </div>
          </div>

          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-sm">{t("nav.close")}</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>{t("nav.close")}</button>
        </form>
      </dialog>

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
