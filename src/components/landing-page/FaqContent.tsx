"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import Footer from "@/components/landing-page/Footer";
import LandingNavbar from "@/components/landing-page/LandingNavbar";
import FaqSection from "@/components/landing-page/FaqSection";

export default function FaqContent() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <LandingNavbar />
      {/* Visually hidden — FaqSection's own heading is the visible one;
          this just gives the page a real h1 (reusing the existing footer
          label rather than inventing new copy for text no one sees). */}
      <h1 className="sr-only">{t("footer.faq")}</h1>
      <FaqSection />
      <Footer />
    </div>
  );
}
