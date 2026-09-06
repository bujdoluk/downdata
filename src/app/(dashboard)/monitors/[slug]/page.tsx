import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveCatalogEntryBySlug } from "@/lib/catalog";
import ServiceDetail from "@/components/service/ServiceDetail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await resolveCatalogEntryBySlug(slug);
  return { title: `${service?.name ?? "Service"} · downDATA` };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!(await resolveCatalogEntryBySlug(slug))) {
    notFound();
  }

  return (
    <main className="flex flex-1 items-center-safe justify-center p-6">
      <ServiceDetail slug={slug} />
    </main>
  );
}
