"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Temporal } from "temporal-polyfill";
import { useCookieConsent } from "@/components/cookies/CookieConsent";

export default function Footer() {
  const { t } = useTranslation();
  const { openPreferences } = useCookieConsent();
  const year = Temporal.Now.plainDateISO().year;

  return (
    <footer className="border-base-300 bg-base-100 text-base-content/60 flex flex-col items-center gap-2 border-t py-6 text-center text-sm">
      <span>{t("footer.copyright", { year })}</span>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link href="/privacy" className="link link-hover">
          {t("footer.privacyPolicy")}
        </Link>
        <Link href="/terms" className="link link-hover">
          {t("footer.termsOfService")}
        </Link>
        <button type="button" className="link link-hover" onClick={openPreferences}>
          {t("cookieConsent.preferencesLink")}
        </button>
      </div>
    </footer>
  );
}
