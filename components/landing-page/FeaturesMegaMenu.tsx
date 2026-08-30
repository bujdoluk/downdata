"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { FEATURE_CATALOG } from "@/lib/featureCatalog";
import CatalogMegaMenu from "@/components/landing-page/CatalogMegaMenu";

export default function FeaturesMegaMenu() {
  const { t } = useTranslation();

  return (
    <CatalogMegaMenu
      label={t("landing.nav.features")}
      entries={FEATURE_CATALOG}
      hrefPrefix="/features"
      menuClassName="w-96 xl:w-[40rem] xl:grid-cols-2"
      renderIcon={(entry) => <entry.icon className="text-primary mt-0.5 h-5 w-5 shrink-0" />}
      renderLabel={(entry) => t(`nav.${entry.slug}`)}
      renderDescription={(entry) => t(`features.${entry.slug}`)}
    />
  );
}
