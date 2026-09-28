import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveCatalogEntryBySlug } from "@/lib/catalog";
import PublicServiceDetail from "@/features/monitors/components/PublicServiceDetail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await resolveCatalogEntryBySlug(slug);
  return { title: `${service?.name ?? "Service"} · downDATA` };
}

export default async function PublicServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!(await resolveCatalogEntryBySlug(slug))) {
    notFound();
  }

  return (
    <main className="flex flex-1 items-center-safe justify-center p-6">
      <PublicServiceDetail slug={slug} />
    </main>
  );
}
