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

      <PricingSection />

      {/* Closing CTA — same block LandingPage.tsx ends on */}
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
