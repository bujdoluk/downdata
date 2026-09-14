"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import ClosingCta from "@/components/landing-page/ClosingCta";
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

      <ClosingCta heading={t("landing.closing.heading")} ctaLabel={t("landing.closing.cta")} href="/boards" />

      <Footer />
    </div>
  );
}
