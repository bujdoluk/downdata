"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import Footer from "@/components/landing-page/Footer";
import LandingNavbar from "@/components/landing-page/LandingNavbar";
import type { FeatureSlug } from "@/lib/featureCatalog";
import { resolveFeature } from "@/lib/featureCatalog";

export default function FeaturePageContent({ slug }: { slug: FeatureSlug }) {
  const { t } = useTranslation();
  const feature = resolveFeature(slug);
  if (!feature) return null;
  const Icon = feature.icon;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <LandingNavbar />
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <div className="bg-primary/10 text-primary mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
          <Icon className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold">{t(`nav.${slug}`)}</h1>
        <p className="text-base-content/70 mt-4 max-w-xl text-lg leading-relaxed">{t(`features.${slug}`)}</p>
      </div>
      <Footer />
    </div>
  );
}
