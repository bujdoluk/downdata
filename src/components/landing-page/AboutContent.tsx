"use client";

import Image from "next/image";
import { Trans, useTranslation } from "react-i18next";
import { SK } from "country-flag-icons/react/1x1";
import "@/lib/i18n/i18n";
import Footer from "@/components/landing-page/Footer";
import LandingNavbar from "@/components/landing-page/LandingNavbar";
import Logo from "@/components/navbar/Logo";
import BackLink from "@/components/BackLink";
import PageHeader from "@/components/PageHeader";
import { useCookieConsent } from "@/components/cookies/CookieConsent";
import { openSupportChat } from "@/features/support/services/tawkChat";
import lukasPhoto from "./lukas.webp";

// TODO: real X handle; placeholder avoids a guess that could be someone else's account.
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
  const { consent, openPreferences } = useCookieConsent();

  // Safe in every locale: "downDATA" is a fixed literal, not translated.
  const [followBrandBefore, followBrandAfter] = t("about.followOnX", { name: "downDATA" }).split("downDATA");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <LandingNavbar />
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <PageHeader back={<BackLink fallbackHref="/landing-page" label={t("about.back")} />}>
          <h1 className="text-3xl font-bold">
            <Trans i18nKey="about.title" components={{ brand }} />
          </h1>
        </PageHeader>

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
