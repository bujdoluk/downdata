import { notFound } from "next/navigation";
import { resolveServiceBySlug } from "@/lib/services";
import ServiceDetail from "@/components/service/ServiceDetail";

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!resolveServiceBySlug(slug)) {
    notFound();
  }

  return (
    <main className="flex flex-1 items-center-safe justify-center p-6">
      <ServiceDetail slug={slug} />
    </main>
  );
}
