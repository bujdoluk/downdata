"use client";

import { useRef } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import Logo from "@/components/navbar/Logo";
import ThemeToggle from "@/components/navbar/ThemeToggle";
import LanguageSwitcher from "@/components/navbar/LanguageSwitcher";
import SidebarNavLink from "@/components/sidebar/SidebarNavLink";
import { GearIcon, ActivityIcon } from "@/components/icons/NavIcons";
import { useCloseDetailsOnOutsideClick } from "@/lib/useCloseDetailsOnOutsideClick";

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

export default function NavbarClient() {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDetailsElement>(null);

  useCloseDetailsOnOutsideClick(menuRef);

  function closeMenu() {
    if (menuRef.current) menuRef.current.open = false;
  }

  return (
    <header className="sticky top-0 z-10">
      <div className="relative left-1/2 right-1/2 w-screen -mx-[50vw] border-b border-white/10 bg-[#0a0b10]">
        <div data-theme="dark" className="navbar max-w-7xl pl-6">
          <div className="navbar-start gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo className="h-6 w-6" />
              <span className="text-lg font-semibold tracking-tight text-base-content">
                <span className="text-primary">down</span>DATA
              </span>
            </Link>
          </div>

          <div className="navbar-end md:hidden">
            <details ref={menuRef} className="dropdown dropdown-end">
              <summary
                className="btn btn-ghost btn-circle btn-sm list-none"
                aria-label={t("nav.menu")}
              >
                <MenuIcon />
              </summary>
              <ul className="dropdown-content menu menu-sm bg-base-100 border-base-300 z-30 mt-2 w-56 border shadow-xl">
                <li>
                  <SidebarNavLink
                    href="/"
                    icon={<GearIcon className="shrink-0" />}
                    label={t("nav.services")}
                    onNavigate={closeMenu}
                  />
                </li>
                <li>
                  <SidebarNavLink
                    href="/monitors"
                    icon={<ActivityIcon className="shrink-0" />}
                    label={t("nav.monitors")}
                    onNavigate={closeMenu}
                  />
                </li>
                <li className="border-base-300 mt-1 border-t pt-1">
                  <div className="flex items-center justify-between px-1 py-1">
                    <LanguageSwitcher />
                    <ThemeToggle />
                  </div>
                </li>
              </ul>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}
