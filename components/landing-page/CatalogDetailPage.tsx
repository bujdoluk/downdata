"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import type { ReactNode } from "react";
import Footer from "@/components/landing-page/Footer";
import LandingNavbar from "@/components/landing-page/LandingNavbar";

// Shared layout for a single catalog entry's marketing page (a feature or an
// integration provider) — both read the same nav.${slug}/features.${slug}
// translation keys and only differ in which icon/logo fills the badge.
export default function CatalogDetailPage({ slug, icon }: { slug: string; icon: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <LandingNavbar />
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <div className="bg-primary/10 text-primary mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
          {icon}
        </div>
        <h1 className="text-3xl font-bold">{t(`nav.${slug}`)}</h1>
        <p className="text-base-content/70 mt-4 max-w-xl text-lg leading-relaxed">{t(`features.${slug}`)}</p>
      </div>
      <Footer />
    </div>
  );
}
