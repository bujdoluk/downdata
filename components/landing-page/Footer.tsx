"use client";

import Link from "next/link";
import { Trans, useTranslation } from "react-i18next";
import { Temporal } from "temporal-polyfill";
import "@/lib/i18n/i18n";
import Logo from "@/components/navbar/Logo";
import SlackLogo from "@/components/integrations/SlackLogo";
import { useCookieConsent } from "@/components/cookies/CookieConsent";
import { FEATURE_CATALOG } from "@/lib/featureCatalog";

export default function Footer() {
  const { t } = useTranslation();
  const { openPreferences } = useCookieConsent();
  const year = Temporal.Now.plainDateISO().year;

  return (
    <footer className="footer sm:footer-horizontal bg-neutral text-neutral-content p-10">
      <aside>
        <div className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <Logo className="h-6 w-6" />
          <span>
            <span className="text-primary">down</span>DATA
          </span>
        </div>
        <p className="mt-2">
          <Trans i18nKey="footer.copyright" values={{ year }} components={{ brand: <span className="text-primary" /> }} />
        </p>
      </aside>

      <nav>
        <h6 className="footer-title">{t("landing.nav.features")}</h6>
        {FEATURE_CATALOG.filter(({ slug }) => slug !== "integrations").map(({ slug, icon: Icon }) => (
          <Link key={slug} href={`/features/${slug}`} className="link link-hover inline-flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {t(`nav.${slug}`)}
          </Link>
        ))}
      </nav>

      <nav>
        <h6 className="footer-title">{t("nav.integrations")}</h6>
        <Link href="/features/integrations" className="link link-hover inline-flex items-center gap-1.5">
          <SlackLogo size={14} />
          Slack
        </Link>
      </nav>

      <nav>
        <h6 className="footer-title">{t("footer.companyTitle")}</h6>
        <Link href="/landing-page#pricing" className="link link-hover">
          {t("landing.pricing.heading")}
        </Link>
        <Link href="/about" className="link link-hover">
          {t("footer.about")}
        </Link>
        <Link href="/faq" className="link link-hover">
          {t("footer.faq")}
        </Link>
      </nav>

      <nav>
        <h6 className="footer-title">{t("footer.legalTitle")}</h6>
        <Link href="/privacy" className="link link-hover">
          {t("footer.privacyPolicy")}
        </Link>
        <Link href="/terms" className="link link-hover">
          {t("footer.termsOfService")}
        </Link>
        <button type="button" className="link link-hover" onClick={openPreferences}>
          {t("cookieConsent.preferencesLink")}
        </button>
      </nav>
    </footer>
  );
}
