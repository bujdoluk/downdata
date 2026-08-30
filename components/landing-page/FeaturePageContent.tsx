"use client";

import type { FeatureSlug } from "@/lib/featureCatalog";
import { resolveFeature } from "@/lib/featureCatalog";
import CatalogDetailPage from "@/components/landing-page/CatalogDetailPage";

export default function FeaturePageContent({ slug }: { slug: FeatureSlug }) {
  const feature = resolveFeature(slug);
  if (!feature) return null;
  const Icon = feature.icon;

  return <CatalogDetailPage slug={slug} icon={<Icon className="h-7 w-7" />} />;
}
