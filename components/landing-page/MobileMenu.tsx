"use client";

import { useRef } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { FEATURE_CATALOG } from "@/lib/featureCatalog";
import { INTEGRATION_CATALOG } from "@/lib/integrationCatalog";
import { MenuIcon } from "@/components/icons/NavIcons";
import LanguageSwitcher from "@/components/navbar/LanguageSwitcher";
import ThemeToggle from "@/components/navbar/ThemeToggle";
import { useCloseDetailsOnOutsideClick } from "@/hooks/useCloseDetailsOnOutsideClick";

export default function MobileMenu() {
  const { t } = useTranslation();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useCloseDetailsOnOutsideClick(detailsRef);

  function close() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details ref={detailsRef} className="dropdown dropdown-end md:hidden">
      <summary className="btn btn-ghost btn-circle btn-sm list-none" aria-label={t("landing.nav.menu")}>
        <MenuIcon />
      </summary>
      <div className="dropdown-content bg-base-100 border-base-300 fixed inset-x-4 top-20 z-30 max-h-[70vh] overflow-y-auto rounded-box border p-3 shadow-xl">
        <span className="text-base-content/50 block px-2 pt-1 text-xs font-semibold tracking-wide uppercase">
          {t("landing.nav.features")}
        </span>
        <ul className="list-none">
          {FEATURE_CATALOG.map(({ slug, icon: Icon }) => (
            <li key={slug}>
              <Link
                href={`/features/${slug}`}
                onClick={close}
                className="hover:bg-base-200 flex items-center gap-3 rounded-lg p-2 transition-colors"
              >
                <Icon className="text-primary h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">{t(`nav.${slug}`)}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="divider my-1" />

        <span className="text-base-content/50 block px-2 pt-1 text-xs font-semibold tracking-wide uppercase">
          {t("nav.integrations")}
        </span>
        <ul className="list-none">
          {INTEGRATION_CATALOG.map(({ slug, logo: Logo }) => (
            <li key={slug}>
              <Link
                href={`/integrations/${slug}`}
                onClick={close}
                className="hover:bg-base-200 flex items-center gap-3 rounded-lg p-2 transition-colors"
              >
                <Logo size={20} />
                <span className="text-sm font-medium">{t(`nav.${slug}`)}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="divider my-1" />

        <ul className="list-none">
          <li>
            <Link href="/pricing" onClick={close} className="hover:bg-base-200 block rounded-lg p-2 text-sm font-medium transition-colors">
              {t("landing.nav.pricing")}
            </Link>
          </li>
          <li>
            <Link href="/login?mode=signup" onClick={close} className="hover:bg-base-200 block rounded-lg p-2 text-sm font-medium transition-colors">
              {t("landing.nav.signUp")}
            </Link>
          </li>
        </ul>

        <div className="divider my-1" />

        <Link href="/boards" onClick={close} className="btn btn-info btn-sm w-full rounded-full">
          {t("landing.nav.startTrial")}
        </Link>

        <div className="mt-3 flex items-center justify-center gap-2">
          <LanguageSwitcher inline />
          <ThemeToggle />
        </div>
      </div>
    </details>
  );
}
