import { notFound } from "next/navigation";
import { getServiceBySlug } from "@/lib/services";
import ServiceDetail from "@/components/service/ServiceDetail";

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!getServiceBySlug(slug)) {
    notFound();
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ServiceDetail slug={slug} />
    </main>
  );
}
