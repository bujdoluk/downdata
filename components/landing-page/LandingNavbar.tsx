"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import Logo from "@/components/navbar/Logo";
import LanguageSwitcher from "@/components/navbar/LanguageSwitcher";

export default function LandingNavbar() {
  const { t } = useTranslation();

  return (
    <nav className="border-base-300 border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
          <Logo className="h-6 w-6" />
          <span>
            <span className="text-primary">down</span>DATA
          </span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/landing-page#pricing"
            className="text-base-content/70 hover:text-base-content transition-colors"
          >
            {t("landing.nav.pricing")}
          </Link>
          <Link href="/login?mode=signup" className="text-base-content/70 hover:text-base-content transition-colors">
            {t("landing.nav.signUp")}
          </Link>
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}
