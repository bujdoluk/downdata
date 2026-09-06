"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import Footer from "@/components/landing-page/Footer";
import LandingNavbar from "@/components/landing-page/LandingNavbar";
import Sidebar from "@/components/sidebar/Sidebar";
import { useCookieConsent } from "@/components/cookies/CookieConsent";
import { hasNavigatedClientSide } from "@/lib/clientNavigationTracker";
import { openSupportChat } from "@/lib/tawkChat";
import { SUPPORT_EMAIL } from "@/lib/constants";

export default function SupportContent({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { consent, openPreferences } = useCookieConsent();

  // Same "wherever you came from, with a direct-visit fallback" back button
  // as AboutContent.tsx — /support is reachable from the footer on every
  // marketing/legal page, not just one fixed parent. Only shown on the
  // logged-out marketing chrome; the dashboard shell already has its own
  // navigation (the Sidebar).
  function handleBack() {
    if (hasNavigatedClientSide()) {
      router.back();
    } else {
      router.push("/landing-page");
    }
  }

  function handleChatClick() {
    if (!consent.supportChat) {
      openPreferences();
      return;
    }
    openSupportChat();
  }

  const body = (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      {!isAuthenticated && (
        <button
          type="button"
          onClick={handleBack}
          className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium"
        >
          {t("support.back")}
        </button>
      )}

      <h1 className="mt-2 text-3xl font-bold">{t("support.title")}</h1>
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
        <Sidebar />
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
