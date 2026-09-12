"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import Footer from "@/components/landing-page/Footer";
import LandingNavbar from "@/components/landing-page/LandingNavbar";
import Sidebar from "@/components/sidebar/Sidebar";
import BackLink from "@/components/BackLink";
import PageHeader from "@/components/PageHeader";
import { useCookieConsent } from "@/components/cookies/CookieConsent";
import { openSupportChat } from "@/features/support/services/tawkChat";
import { SUPPORT_EMAIL } from "@/lib/constants";

export default function SupportContent({ isAuthenticated, isAdmin }: { isAuthenticated: boolean; isAdmin: boolean }) {
  const { t } = useTranslation();
  const { consent, openPreferences } = useCookieConsent();

  function handleChatClick() {
    if (!consent.supportChat) {
      openPreferences();
      return;
    }
    openSupportChat();
  }

  // Reachable from the footer on every marketing/legal page when logged
  // out, or from the sidebar's own settings menu when logged in — either
  // way, not one fixed parent, so BackLink goes back to wherever the
  // visitor actually came from. The fallback (a direct/bookmarked visit
  // with no history to return to) differs per branch: /landing-page for a
  // logged-out visitor, /boards (the dashboard's own default) once signed
  // in — /landing-page would be a dead end behind a login wall for them.
  const body = (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <PageHeader back={<BackLink fallbackHref={isAuthenticated ? "/boards" : "/landing-page"} label={t("support.back")} />}>
        <h1 className="text-3xl font-bold">{t("support.title")}</h1>
      </PageHeader>
      <p className="text-base-content/70 mt-2">{t("support.subtitle")}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="card border-base-300 bg-base-200 border">
          <div className="card-body">
            <h2 className="card-title text-lg">{t("support.chatHeading")}</h2>
            <p className="text-base-content/70 text-sm">{t("support.chatBody")}</p>
            <div className="card-actions mt-2">
              <button type="button" className="btn btn-info btn-sm" onClick={handleChatClick}>
                {t("support.chatButton")}
              </button>
            </div>
          </div>
        </div>

        <div className="card border-base-300 bg-base-200 border">
          <div className="card-body">
            <h2 className="card-title text-lg">{t("support.emailHeading")}</h2>
            <p className="text-base-content/70 text-sm">{t("support.emailBody")}</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="link mt-2 inline-block font-medium">
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>

      <h2 className="mt-10 mb-2 text-xl font-bold">{t("support.faqHeading")}</h2>
      <p className="text-base-content/70">
        {t("support.faqBody")}{" "}
        <Link href="/faq" className="link link-hover link-info font-medium">
          {t("support.faqButton")}
        </Link>
      </p>
    </div>
  );

  if (isAuthenticated) {
    return (
      <div className="flex flex-1">
        <Sidebar isAdmin={isAdmin} />
        <main className="flex flex-1 justify-center">{body}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <LandingNavbar />
      {body}
      <Footer />
    </div>
  );
}
