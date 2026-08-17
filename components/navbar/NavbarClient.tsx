"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { ServiceDefinition } from "@/types/service";
import Logo from "@/components/navbar/Logo";
import ThemeToggle from "@/components/navbar/ThemeToggle";
import LanguageSwitcher from "@/components/navbar/LanguageSwitcher";
import ServiceSearch from "@/components/service/ServiceSearch";

export default function NavbarClient({ services }: { services: ServiceDefinition[] }) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-10">
      <div className="relative left-1/2 right-1/2 w-screen -mx-[50vw] border-b border-white/10 bg-[#0a0b10]">
        <div data-theme="dark" className="navbar mx-auto max-w-5xl">
          <div className="navbar-start gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo className="h-6 w-6" />
              <span className="text-lg font-semibold tracking-tight text-base-content">
                <span className="text-primary">down</span>DATA
              </span>
            </Link>
            <ServiceSearch services={services} />
          </div>
          <div className="navbar-end gap-1">
            <Link href="/" className="btn btn-ghost btn-sm text-base-content/70">
              {t("nav.services")}
            </Link>
            <Link href="/add-service" className="btn btn-ghost btn-sm text-base-content/70">
              {t("nav.addService")}
            </Link>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
