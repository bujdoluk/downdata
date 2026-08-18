"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import ServicesHeader from "@/components/sidebar/ServicesHeader";
import LanguageSwitcher from "@/components/navbar/LanguageSwitcher";
import ThemeToggle from "@/components/navbar/ThemeToggle";

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

const STORAGE_KEY = "sidebarCollapsed";

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
      className={`border-base-content/10 bg-base-300 sticky top-16 relative hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r transition-[width] duration-200 md:flex ${
        collapsed ? "w-14 items-center pl-2 py-3" : "w-60 p-4"
      }`}
    >
      <ServicesHeader collapsed={collapsed} />

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
