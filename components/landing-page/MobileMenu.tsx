"use client";

import { useRef } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { FEATURE_CATALOG } from "@/lib/featureCatalog";
import { MenuIcon } from "@/components/icons/NavIcons";
import LanguageSwitcher from "@/components/navbar/LanguageSwitcher";
import { useCloseDetailsOnOutsideClick } from "@/lib/useCloseDetailsOnOutsideClick";

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

        <ul className="list-none">
          <li>
            <Link href="/features/integrations" onClick={close} className="hover:bg-base-200 block rounded-lg p-2 text-sm font-medium transition-colors">
              {t("nav.integrations")}
            </Link>
          </li>
          <li>
            <Link href="/landing-page#pricing" onClick={close} className="hover:bg-base-200 block rounded-lg p-2 text-sm font-medium transition-colors">
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

        <Link href="/boards" onClick={close} className="btn btn-primary btn-sm w-full rounded-full">
          {t("landing.nav.startTrial")}
        </Link>

        <div className="mt-3 flex justify-center">
          <LanguageSwitcher inline />
        </div>
      </div>
    </details>
  );
}
