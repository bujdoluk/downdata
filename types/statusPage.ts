import type { Indicator, StatuspageIncidentSummary } from "@/types/service";

// Owner-side settings, read/written from the board detail page's status
// page panel — always scoped to the caller's own board via RLS.
export type BoardStatusPage = {
  boardId: string;
  slug: string;
  enabled: boolean;
  companyName: string | null;
  logoUrl: string | null;
  hideBranding: boolean;
};

// One board's public page, already resolved for display: companyName and
// logoUrl carry the "custom or fallback" decision baked in server-side
// (lib/statusPages.ts's getPublicStatusPageBySlug), not left for the
// client to reapply — company_name null becomes the board's own name,
// logo_url stays null (the client renders downDATA's default mark unless
// hideBranding is set).
export type PublicStatusPage = {
  slug: string;
  companyName: string;
  logoUrl: string | null;
  hideBranding: boolean;
  services: PublicStatusPageService[];
};

// Per-service shape for the public page's tracked-services list — the
// same fields app/api/summary/[slug]/route.ts already computes for one
// service (last30DaysIncidents/trackedSince/official30daysUptime/
// uptimeWindowDays), plus the live indicator from the status batch.
export type PublicStatusPageService = {
  slug: string;
  name: string;
  indicator: Indicator | null; // null when the live fetch failed
  last30DaysIncidents: StatuspageIncidentSummary[];
  trackedSince: string | null;
  official30daysUptime: number;
  uptimeWindowDays: number;
};
