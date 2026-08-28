"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Trans, useTranslation } from "react-i18next";
import { SK } from "country-flag-icons/react/1x1";
import "@/lib/i18n/i18n";
import Footer from "@/components/landing-page/Footer";
import LandingNavbar from "@/components/landing-page/LandingNavbar";
import Logo from "@/components/navbar/Logo";
import { useCookieConsent } from "@/components/cookies/CookieConsent";
import { hasNavigatedClientSide } from "@/lib/clientNavigationTracker";
import { openSupportChat } from "@/lib/tawkChat";
import lukasPhoto from "./lukas.webp";

// TODO: replace with downDATA's real X/Twitter handle once one exists —
// left as an invalid, obviously-placeholder href rather than a guessed
// handle that could resolve to someone else's real account.
const DOWNDATA_X_URL = "[Insert downDATA's X handle here]";

const brand = <span className="text-primary" />;

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function AboutContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const { consent, openPreferences } = useCookieConsent();

  // "downDATA" is a fixed literal passed as `name` below (not translated
  // content), so splitting the interpolated result on it is safe in every
  // locale — same technique LandingPage.tsx uses for its hero copy.
  const [followBrandBefore, followBrandAfter] = t("about.followOnX", { name: "downDATA" }).split("downDATA");

  function handleBack() {
    // /about is reachable from several pages (landing, privacy, terms) via
    // the shared footer, unlike serviceDetail.back's single fixed parent —
    // so this actually goes back to wherever the visitor came from, with a
    // fallback for a direct/bookmarked visit that has no history to return to.
    // (window.history.length isn't a safe way to tell those apart — its
    // baseline on a fresh tab isn't consistent — see clientNavigationTracker.ts.)
    if (hasNavigatedClientSide()) {
      router.back();
    } else {
      router.push("/landing-page");
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <LandingNavbar />
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <button
          type="button"
          onClick={handleBack}
          className="link link-hover text-base-content/50 hover:text-base-content text-xs font-medium"
        >
          {t("about.back")}
        </button>

        <h1 className="mt-2 text-3xl font-bold">
          <Trans i18nKey="about.title" components={{ brand }} />
        </h1>

        <h2 className="mt-8 mb-3 text-xl font-bold">{t("about.storyHeading")}</h2>
        <p>
          <Trans i18nKey="about.storyBody" components={{ brand }} />
        </p>

        <h2 className="mt-8 mb-3 text-xl font-bold">{t("about.teamHeading")}</h2>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Image
            src={lukasPhoto}
            alt="Lukáš Bujdoš"
            className="h-20 w-20 shrink-0 rounded-full object-cover"
          />
          <p className="flex-1">
            <Trans
              i18nKey="about.teamBody"
              components={{ flag: <SK className="mx-1 inline-block h-3 w-4 rounded-[2px] align-baseline" />, brand }}
            />
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <a
            href="https://x.com/bujdoluk"
            target="_blank"
            rel="noopener noreferrer"
            className="link link-hover inline-flex items-center gap-1.5"
          >
            <XIcon className="h-3.5 w-3.5" />
            {t("about.followOnX", { name: "Lukáš" })}
          </a>
          <a
            href={DOWNDATA_X_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="link link-hover inline-flex items-center gap-1.5"
          >
            <Logo className="h-3.5 w-3.5" />
            {followBrandBefore}
            downDATA
            {followBrandAfter}
          </a>
          <button
            type="button"
            className="link link-hover"
            onClick={() => {
              if (!consent.supportChat) {
                openPreferences();
                return;
              }
              openSupportChat();
            }}
          >
            {t("about.chatWithUs")}
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
