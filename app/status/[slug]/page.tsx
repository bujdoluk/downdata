import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicStatusPage } from "@/lib/statusPages";
import PublicStatusPageContent from "@/components/statusPage/PublicStatusPageContent";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const statusPage = await getPublicStatusPage(slug);
  return { title: statusPage ? `${statusPage.companyName} Status` : "Status page not found" };
}

// Public, unauthenticated (see proxy.ts's PUBLIC_PREFIXES) — a board
// owner's shareable status page, not behind the dashboard shell.
export default async function PublicStatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const statusPage = await getPublicStatusPage(slug);
  if (!statusPage) {
    notFound();
  }

  return (
    <main className="flex flex-1 justify-center p-6">
      <PublicStatusPageContent slug={slug} initialData={statusPage} />
    </main>
  );
}
