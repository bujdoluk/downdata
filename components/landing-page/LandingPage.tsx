"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import PricingSection from "@/components/landing-page/PricingSection";
import LanguageSwitcher from "@/components/navbar/LanguageSwitcher";
import Logo from "@/components/navbar/Logo";
import CatalogServiceCard from "@/components/service/CatalogServiceCard";
import { AlertIcon } from "@/components/icons/NavIcons";

const mono = "font-mono";

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  );
}

function UserGroupIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
      />
    </svg>
  );
}

function StackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
      />
    </svg>
  );
}

const demoRows = [
  { slug: "supabase", name: "Supabase", indicator: "minor", outages24h: 1 },
  { slug: "github", name: "GitHub", indicator: "none", outages24h: 0 },
  { slug: "cloudflare", name: "Cloudflare", indicator: "none", outages24h: 0 },
] as const;

export default function LandingPage() {
  const { t } = useTranslation();

  const features = [
    { icon: BoltIcon, title: t("landing.features.speedTitle"), body: t("landing.features.speedBody") },
    { icon: AlertIcon, title: t("landing.features.monitoringTitle"), body: t("landing.features.monitoringBody") },
    { icon: UserGroupIcon, title: t("landing.features.seatsTitle"), body: t("landing.features.seatsBody") },
    { icon: StackIcon, title: t("landing.features.selfHostedTitle"), body: t("landing.features.selfHostedBody") },
  ];

  const [heroBodyBefore, heroBodyAfter] = t("landing.hero.body", {
    interval: "30s",
    price: "$5/month",
    competitorPrice: "$274",
  }).split("downDATA");

  return (
    <div data-theme="dark" className="bg-base-100 text-base-content">
      {/* Nav */}
      <nav className="border-base-300 border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
            <Logo className="h-6 w-6" />
            <span>
              <span className="text-primary">down</span>DATA
            </span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <a href="#pricing" className="text-base-content/70 hover:text-base-content transition-colors">
              {t("landing.nav.pricing")}
            </a>
            <LanguageSwitcher />
            <a href="#" className="btn btn-sm rounded-full">
              {t("landing.nav.startTrial")}
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="bg-primary/20 pointer-events-none absolute top-[-12rem] left-1/2 h-[36rem] w-[56rem] -translate-x-1/2 rounded-full blur-[120px]"
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-8 py-24 lg:grid-cols-[1.05fr_1fr] lg:py-32">
          <div className="flex flex-col items-center gap-7 text-center lg:items-start lg:text-left">
            <div className={`badge badge-success badge-soft gap-2 py-4 text-[0.72rem] tracking-[0.1em] uppercase ${mono}`}>
              <span className="bg-success animate-signal-pulse h-[7px] w-[7px] rounded-full" />
              {t("landing.hero.eyebrow")}
            </div>

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
              <a href="#" className="btn btn-primary rounded-full shadow-lg">
                {t("landing.hero.ctaTrial")}
              </a>
              <a href="#pricing" className="btn btn-outline rounded-full">
                {t("landing.hero.ctaPricing")}
              </a>
            </div>
            <div className="text-base-content/50 text-sm">{t("landing.hero.noCard")}</div>
          </div>

          {/* Demo panel — the hero visual */}
          <div className="relative mx-auto w-full max-w-md lg:mx-0">
            <div className="bg-primary/10 absolute inset-0 translate-x-3 translate-y-3 rounded-2xl" aria-hidden="true" />
            <div className="card card-border bg-base-200 relative shadow-2xl">
              <div className="card-body gap-3 p-6">
                <div className="flex items-center justify-between px-1 pb-1">
                  <span className={`text-base-content/50 text-[0.7rem] tracking-[0.1em] uppercase ${mono}`}>
                    {t("landing.hero.liveDashboard")}
                  </span>
                  <span className="flex gap-1.5">
                    <span className="bg-base-content/10 h-2.5 w-2.5 rounded-full" />
                    <span className="bg-base-content/10 h-2.5 w-2.5 rounded-full" />
                    <span className="bg-base-content/10 h-2.5 w-2.5 rounded-full" />
                  </span>
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
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="border-base-300 bg-base-200/40 border-t py-24">
        <div className="mx-auto max-w-6xl px-8">
          <div className="mx-auto mb-14 flex max-w-xl flex-col items-center gap-3 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
              {t("landing.features.heading")}
            </h2>
            <p className="text-base-content/70">{t("landing.features.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="card card-border bg-base-200 hover:border-base-content/20 transition-colors">
                <div className="card-body gap-4 p-7">
                  <div className="bg-primary/10 flex h-11 w-11 items-center justify-center rounded-xl">
                    <Icon className="text-primary h-6 w-6" />
                  </div>
                  <h3 className="card-title text-base">{title}</h3>
                  <p className="text-base-content/70 text-sm leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PricingSection />

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
          <a href="#" className="btn btn-primary rounded-full shadow-lg">
            {t("landing.closing.cta")}
          </a>
        </div>
      </div>

      <footer className="border-base-300 border-t py-10">
        <div className="text-base-content/50 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-8 text-sm">
          <span className="flex items-center gap-2 font-bold">
            <Logo className="h-4 w-4" />
            <span>
              <span className="text-primary">down</span>DATA
            </span>
          </span>
          <span>{t("landing.footer")}</span>
        </div>
      </footer>
    </div>
  );
}
