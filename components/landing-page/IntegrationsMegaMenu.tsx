"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { INTEGRATION_CATALOG } from "@/lib/integrationCatalog";
import CatalogMegaMenu from "@/components/landing-page/CatalogMegaMenu";

export default function IntegrationsMegaMenu() {
  const { t } = useTranslation();

  return (
    <CatalogMegaMenu
      label={t("nav.integrations")}
      entries={INTEGRATION_CATALOG}
      hrefPrefix="/integrations"
      menuClassName="w-72"
      renderIcon={(entry) => <entry.logo size={24} className="mt-0.5 shrink-0" />}
      renderLabel={(entry) => t(`nav.${entry.slug}`)}
      renderDescription={(entry) => t(`features.${entry.slug}`)}
    />
  );
}
