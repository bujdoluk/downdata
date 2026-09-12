"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import Footer from "@/components/landing-page/Footer";
import LandingNavbar from "@/components/landing-page/LandingNavbar";
import PricingSection from "@/components/landing-page/PricingSection";

export default function PricingContent() {
  const { t } = useTranslation();

  return (
    <div className="bg-base-100 text-base-content">
      <LandingNavbar />

      {/* Visually hidden — PricingSection's own heading is the visible one;
          this just gives the page a real h1 (reusing the existing nav
          label rather than inventing new copy for text no one sees). */}
      <h1 className="sr-only">{t("landing.nav.pricing")}</h1>

      <PricingSection />

      {/* Closing CTA — same block LandingPage.tsx ends on */}
      <div className="border-base-300 border-t py-28 text-center">
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
