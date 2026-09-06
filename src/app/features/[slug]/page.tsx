import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURE_CATALOG, resolveFeature } from "@/lib/featureCatalog";
import FeaturePageContent from "@/components/landing-page/FeaturePageContent";
import en from "@/lib/i18n/locales/en.json";

export function generateStaticParams() {
  return FEATURE_CATALOG.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = resolveFeature(slug);
  if (!feature) return {};

  const title = `${en.nav[feature.slug]} — downDATA`;
  const description = en.features[feature.slug];

  return {
    title,
    description,
    alternates: { canonical: `/features/${feature.slug}` },
    openGraph: { title, description, url: `/features/${feature.slug}`, siteName: "downDATA", type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = resolveFeature(slug);
  if (!feature) notFound();

  return <FeaturePageContent slug={feature.slug} />;
}
