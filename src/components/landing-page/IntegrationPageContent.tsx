"use client";

import type { IntegrationProviderSlug } from "@/lib/integrationCatalog";
import { resolveIntegrationProvider } from "@/lib/integrationCatalog";
import CatalogDetailPage from "@/components/landing-page/CatalogDetailPage";

export default function IntegrationPageContent({ slug }: { slug: IntegrationProviderSlug }) {
  const provider = resolveIntegrationProvider(slug);
  if (!provider) return null;
  const Logo = provider.logo;

  return <CatalogDetailPage slug={slug} icon={<Logo size={28} />} />;
}
