import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublicStatusPage, getStatusPageProtectionBySlug, type StatusPageProtection } from "@/features/status-pages/services/statusPages";
import { getClientIp, isStatusPageUnlocked, unlockCookieName } from "@/features/status-pages/services/passwordProtection";
import PublicStatusPageContent from "@/features/status-pages/components/PublicStatusPageContent";
import StatusPagePasswordGate from "@/features/status-pages/components/StatusPagePasswordGate";

async function resolveUnlocked(slug: string, protection: StatusPageProtection): Promise<boolean> {
  const [headersList, cookieStore] = await Promise.all([headers(), cookies()]);
  const clientIp = getClientIp(headersList);
  const cookieValue = cookieStore.get(unlockCookieName(slug))?.value ?? null;
  return isStatusPageUnlocked(protection, { clientIp, cookieValue });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const protection = await getStatusPageProtectionBySlug(slug);
  if (!protection) return { title: "Status page not found" };

  // Keep the company name out of <title> until unlocked; hiding what you track is part of the point.
  if (!(await resolveUnlocked(slug, protection))) return { title: "Protected status page" };

  const statusPage = await getPublicStatusPage(slug);
  return { title: statusPage ? `${statusPage.companyName} Status` : "Status page not found" };
}

export default async function PublicStatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const protection = await getStatusPageProtectionBySlug(slug);
  if (!protection) {
    notFound();
  }

  if (!(await resolveUnlocked(slug, protection))) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <StatusPagePasswordGate slug={slug} requiresPassword={protection.passwordHash !== null} />
      </main>
    );
  }

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
