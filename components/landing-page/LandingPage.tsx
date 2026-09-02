"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import FaqSection from "@/components/landing-page/FaqSection";
import Footer from "@/components/landing-page/Footer";
import LandingNavbar from "@/components/landing-page/LandingNavbar";
import PricingSection from "@/components/landing-page/PricingSection";
import TrustedServicesRow from "@/components/landing-page/TrustedServicesRow";
import RevealOnScroll from "@/components/landing-page/RevealOnScroll";
import CatalogServiceCard from "@/components/service/CatalogServiceCard";
import { INDICATOR_STYLES } from "@/components/service/statusStyles";
import { AlertIcon, BoardIcon, BoltIcon, UserGroupIcon } from "@/components/icons/NavIcons";

const mono = "font-mono";

const demoRows = [
  { slug: "supabase", name: "Supabase", indicator: "minor", outages24h: 1 },
  { slug: "github", name: "GitHub", indicator: "none", outages24h: 0 },
  { slug: "cloudflare", name: "Cloudflare", indicator: "none", outages24h: 0 },
] as const;

export default function LandingPage() {
  const { t } = useTranslation();

  const [heroBodyBefore, heroBodyAfter] = t("landing.hero.body", { interval: "30s" }).split("downDATA");

  return (
    <div className="bg-base-100 text-base-content">
      <LandingNavbar />

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="bg-primary/20 pointer-events-none absolute top-[-10rem] left-1/2 h-[36rem] w-[56rem] -translate-x-1/2 rounded-full blur-[120px]"
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-8 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div className="flex flex-col items-center gap-7 text-center lg:items-start lg:text-left">
            <h1 className="max-w-xl text-5xl leading-[1.05] font-black tracking-tight text-balance sm:text-6xl">
              {t("landing.hero.titlePrefix")}{" "}
              <span className="text-primary">{t("landing.hero.titleDown")}</span>
              {t("landing.hero.titleSuffix")}
            </h1>

            <p className="text-base-content/70 max-w-lg text-lg leading-relaxed">
              {heroBodyBefore}
              <span className="text-primary font-bold">down</span>
              <span className="text-base-content font-bold">DATA</span>
              {heroBodyAfter}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <Link href="/boards" className="btn btn-info rounded-full shadow-lg">
                {t("landing.hero.ctaTrial")}
              </Link>
              <span className="text-base-content/50 text-sm">{t("landing.hero.noCard")}</span>
            </div>
          </div>

          {/* Demo panel — the hero visual */}
          <div className="relative mx-auto w-full max-w-md lg:mx-0">
            <div className="bg-primary/10 absolute inset-0 translate-x-3 translate-y-3 rounded-2xl" aria-hidden="true" />
            <div className="card card-border bg-base-200 relative shadow-2xl">
              <div className="card-body gap-3 p-6">
                <div className="flex items-center justify-between px-1">
                  <span className={`text-base-content/50 text-[0.7rem] tracking-[0.1em] uppercase ${mono}`}>
                    {t("landing.hero.liveDashboard")}
                  </span>
                  <span className="flex gap-1.5">
                    <span className="bg-base-content/10 h-2.5 w-2.5 rounded-full" />
                    <span className="bg-base-content/10 h-2.5 w-2.5 rounded-full" />
                    <span className="bg-base-content/10 h-2.5 w-2.5 rounded-full" />
                  </span>
                </div>
                <div className="text-success flex items-center gap-2 px-1 pb-1 text-xs">
                  <span className="bg-success animate-signal-pulse h-[7px] w-[7px] rounded-full" />
                  {t("landing.hero.eyebrow")}
                </div>
                {demoRows.map((row) => (
                  <CatalogServiceCard
                    key={row.slug}
                    slug={row.slug}
                    name={row.name}
                    indicator={row.indicator}
                    outages24h={row.outages24h}
                    isLoading={false}
                    error={false}
                    isMonitored={false}
                    removable={{ removing: false, onRemove: () => {} }}
                    onTogglePin={() => {}}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <TrustedServicesRow />

      {/* Features — asymmetric bento, not four identical cards: the speed and
          monitoring cells carry a real visual (a live tick, a status-dot
          strip), the other two stay plain for contrast/rhythm. */}
      <section className="border-base-300 bg-base-200/40 border-t py-24">
        <div className="mx-auto max-w-6xl px-8">
          <div className="mx-auto mb-14 flex max-w-xl flex-col items-center gap-3 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
              {t("landing.features.heading")}
            </h2>
            <p className="text-base-content/70">{t("landing.features.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <RevealOnScroll className="md:col-span-1 lg:col-span-2">
              <div className="card card-border bg-primary/5 border-primary/20 hover:border-primary/40 h-full transition-colors">
                <div className="card-body gap-4 p-7">
                  <div className="flex items-start justify-between">
                    <div className="bg-primary/10 flex h-11 w-11 items-center justify-center rounded-xl">
                      <BoltIcon className="text-primary h-6 w-6" />
                    </div>
                    <div className={`text-primary flex items-baseline gap-1.5 text-3xl font-bold ${mono}`}>
                      <span className="bg-primary animate-pulse-ring inline-block h-2 w-2 rounded-full" aria-hidden="true" />
                      30s
                    </div>
                  </div>
                  <h3 className="card-title text-base">{t("landing.features.speedTitle")}</h3>
                  <p className="text-base-content/70 text-sm leading-relaxed">{t("landing.features.speedBody")}</p>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delayMs={80} className="md:col-span-1 lg:col-span-1">
              <div className="card card-border bg-info/5 border-info/20 hover:border-info/40 h-full transition-colors">
                <div className="card-body gap-4 p-7">
                  <div className="bg-info/10 flex h-11 w-11 items-center justify-center rounded-xl">
                    <AlertIcon className="text-info h-6 w-6" />
                  </div>
                  <h3 className="card-title text-base">{t("landing.features.monitoringTitle")}</h3>
                  <p className="text-base-content/70 text-sm leading-relaxed">{t("landing.features.monitoringBody")}</p>
                  <div className="mt-1 flex gap-1" aria-hidden="true">
                    {["none", "none", "none", "minor", "none", "none", "critical", "none", "none", "none"].map((indicator, i) => (
                      <span key={i} className={`h-4 w-1.5 rounded-full ${INDICATOR_STYLES[indicator]?.dot}`} />
                    ))}
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delayMs={140} className="md:col-span-1 lg:col-span-1">
              <div className="card card-border bg-base-200 hover:border-base-content/20 h-full transition-colors">
                <div className="card-body gap-4 p-7">
                  <div className="bg-primary/10 flex h-11 w-11 items-center justify-center rounded-xl">
                    <UserGroupIcon className="text-primary h-6 w-6" />
                  </div>
                  <h3 className="card-title text-base">{t("landing.features.seatsTitle")}</h3>
                  <p className="text-base-content/70 text-sm leading-relaxed">{t("landing.features.seatsBody")}</p>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delayMs={200} className="md:col-span-1 lg:col-span-2">
              <div className="card card-border bg-base-200 hover:border-base-content/20 h-full transition-colors">
                <div className="card-body gap-4 p-7 sm:flex-row sm:items-center">
                  <div className="bg-primary/10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                    <BoardIcon className="text-primary h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="card-title text-base">{t("landing.features.boardsTitle")}</h3>
                    <p className="text-base-content/70 mt-1 text-sm leading-relaxed">{t("landing.features.boardsBody")}</p>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      <PricingSection />

      <FaqSection />

      {/* Closing CTA */}
      <div className="border-base-300 relative overflow-hidden border-t py-28 text-center">
        <div
          aria-hidden="true"
          className="bg-primary/10 pointer-events-none absolute top-1/2 left-1/2 h-[24rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-7 px-8">
          <h2 className="max-w-md text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            {t("landing.closing.heading")}
          </h2>
          <Link href="/boards" className="btn btn-info rounded-full shadow-lg">
            {t("landing.closing.cta")}
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
