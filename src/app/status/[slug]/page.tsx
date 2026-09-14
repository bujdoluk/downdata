import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublicStatusPage, getStatusPageProtectionBySlug, type StatusPageProtection } from "@/features/status-pages/services/statusPages";
import { getClientIp, isStatusPageUnlocked, unlockCookieName } from "@/features/status-pages/services/passwordProtection";
import PublicStatusPageContent from "@/features/status-pages/components/PublicStatusPageContent";
import StatusPagePasswordGate from "@/features/status-pages/components/StatusPagePasswordGate";

// Shared by generateMetadata and the page component below so the
// clientIp/cookie resolution (and the isStatusPageUnlocked call itself)
// isn't duplicated — each still does its own getStatusPageProtectionBySlug
// read, since that's a single indexed row lookup, not the heavy live-status
// assembly getPublicStatusPage does (which stays behind React's cache()
// further down, unchanged).
async function resolveUnlocked(slug: string, protection: StatusPageProtection): Promise<boolean> {
  // Independent reads with no data dependency between them — resolved
  // concurrently rather than one after the other.
  const [headersList, cookieStore] = await Promise.all([headers(), cookies()]);
  const clientIp = getClientIp(headersList);
  const cookieValue = cookieStore.get(unlockCookieName(slug))?.value ?? null;
  return isStatusPageUnlocked(protection, { clientIp, cookieValue });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const protection = await getStatusPageProtectionBySlug(slug);
  if (!protection) return { title: "Status page not found" };

  // Don't leak the company name into <title> for a visitor who hasn't
  // passed the gate yet — defeats part of the point of protecting the
  // page (see docs/specs/SPEC-status-page-password.md's StatusGator
  // research: hiding which vendors you track is itself a real use case).
  if (!(await resolveUnlocked(slug, protection))) return { title: "Protected status page" };

  const statusPage = await getPublicStatusPage(slug);
  return { title: statusPage ? `${statusPage.companyName} Status` : "Status page not found" };
}

// Public, unauthenticated (see proxy.ts's PUBLIC_PREFIXES) — a board
// owner's shareable status page, not behind the dashboard shell.
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
