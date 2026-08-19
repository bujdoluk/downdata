"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import SidebarNavLink from "@/components/sidebar/SidebarNavLink";
import LanguageSwitcher from "@/components/navbar/LanguageSwitcher";
import ThemeToggle from "@/components/navbar/ThemeToggle";
import { GearIcon, ActivityIcon, AlertIcon } from "@/components/icons/NavIcons";

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

// Bumped to v2 so anyone with a stale "collapsed" value saved from earlier
// testing resets to the open-by-default state; still persists going forward.
const STORAGE_KEY = "sidebarCollapsed:v2";

export default function Sidebar() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

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
      className={`border-base-content/10 bg-[var(--color-sidebar)] sticky top-16 relative hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r transition-[width] duration-200 md:flex ${
        collapsed ? "w-20 items-center py-3" : "w-60 p-4"
      }`}
    >
      <div className={`flex ${collapsed ? "flex-col items-center gap-4" : "flex-col gap-3"}`}>
        <SidebarNavLink href="/" icon={<GearIcon className="shrink-0" />} label={t("nav.services")} collapsed={collapsed} />
        <SidebarNavLink href="/incidents" icon={<AlertIcon className="shrink-0" />} label={t("nav.incidents")} collapsed={collapsed} />
        <SidebarNavLink href="/monitors" icon={<ActivityIcon className="shrink-0" />} label={t("nav.monitors")} collapsed={collapsed} />
      </div>

      <div
        className={`mt-auto flex ${collapsed ? "flex-col items-center gap-2" : "items-center justify-center gap-3"}`}
      >
        <LanguageSwitcher dropdownClassName="dropdown-start dropdown-top" />
        <ThemeToggle />
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
        title={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
        className="btn btn-circle btn-sm border-base-content/10 bg-base-100 absolute top-1/2 -right-4 z-10 -translate-y-1/2 border shadow-md"
      >
        <ChevronIcon collapsed={collapsed} />
      </button>
    </aside>
  );
}
