import type { Indicator, OpenIncidentImpact, StatuspageIncidentSummary } from "@/types/service";

export type BoardStatusPage = {
  boardId: string;
  slug: string;
  enabled: boolean;
  companyName: string | null;
  logoUrl: string | null;
  hideBranding: boolean;
  passwordProtected: boolean;
  allowedIps: string[];
};

export type PublicStatusPage = {
  slug: string;
  companyName: string;
  logoUrl: string | null;
  hideBranding: boolean;
  services: PublicStatusPageService[];
};

export type PublicStatusPageService = {
  slug: string;
  name: string;
  indicator: Indicator | null; // null when the live fetch failed
  openIncidentImpact?: OpenIncidentImpact;
  last30DaysIncidents: StatuspageIncidentSummary[];
  trackedSince: string | null;
  official30daysUptime: number;
  uptimeWindowDays: number;
};
