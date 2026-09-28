// Shared by the pricing and billing pages so they can't drift. Client-safe:
// Stripe price ids live only in stripe.ts's resolvePriceId().
import type { BillingInterval, PlanTier } from "@/features/billing/types";

export const ANNUAL_DISCOUNT = 0.2;

export function discountedMonthlyPrice(monthly: number): number {
  return Math.round(monthly * (1 - ANNUAL_DISCOUNT) * 100) / 100;
}

export function annualBilledTotal(monthly: number): number {
  return Math.round(monthly * 12 * (1 - ANNUAL_DISCOUNT) * 100) / 100;
}

type PlanFeatures = {
  monitors: string;
  checkInterval: string;
  boards: string | "unlimited";
  statusPages: string | "unlimited";
  adminUsers: string | "unlimited";
  history: string;
  // Free text on purpose: "All" needn't change when a new integration ships.
  integrations: string;
};

export type PlanDefinition = {
  tier: PlanTier;
  monthlyPrice: number;
  available: boolean;
  badge?: "mostTeams" | "inTheMaking";
  trialDays?: number;
  features: PlanFeatures;
};

// "free" is display-only for the pricing page; no `subscriptions` row is ever
// created for it (a missing row means free).
export const PLAN_ORDER: PlanTier[] = ["free", "starter", "growth", "team", "business"];

export const PLAN_CATALOG: Record<PlanTier, PlanDefinition> = {
  free: {
    tier: "free",
    monthlyPrice: 0,
    available: false,
    features: { monitors: "3", checkInterval: "10m", boards: "1", statusPages: "1", adminUsers: "1", history: "1 mo", integrations: "Slack, Email" },
  },
  starter: {
    tier: "starter",
    monthlyPrice: 24.99,
    available: true,
    trialDays: 14,
    features: { monitors: "15", checkInterval: "5m", boards: "1", statusPages: "1", adminUsers: "1", history: "6 mo", integrations: "Slack, Email" },
  },
  growth: {
    tier: "growth",
    monthlyPrice: 49.99,
    available: true,
    trialDays: 14,
    features: { monitors: "30", checkInterval: "2m", boards: "2", statusPages: "2", adminUsers: "2", history: "6 mo", integrations: "All" },
  },
  team: {
    tier: "team",
    monthlyPrice: 99,
    // trialDays pre-set so the trial is ready once a Stripe price exists.
    available: false,
    badge: "mostTeams",
    trialDays: 14,
    features: { monitors: "75", checkInterval: "1m", boards: "5", statusPages: "5", adminUsers: "5", history: "12 mo", integrations: "All" },
  },
  business: {
    tier: "business",
    monthlyPrice: 174.99,
    // Flip to true once resolvePriceId() has a Stripe price for it.
    available: false,
    badge: "inTheMaking",
    trialDays: 14,
    features: { monitors: "150", checkInterval: "1m", boards: "unlimited", statusPages: "unlimited", adminUsers: "15", history: "24 mo", integrations: "All" },
  },
};

export function isBillingInterval(value: string | null): value is BillingInterval {
  return value === "month" || value === "year";
}

export function isPlanTier(value: string | null): value is PlanTier {
  return value === "free" || value === "starter" || value === "growth" || value === "team" || value === "business";
}

// Free tier = no subscriptions row. Kept in sync with
// PLAN_CATALOG.free.features.statusPages by convention, not by code.
export const FREE_TIER_STATUS_PAGES = 1;

// The one place features.statusPages gets parsed, so every quota check agrees.
export function statusPageQuota(tier: PlanTier | null): number {
  if (tier === null) return FREE_TIER_STATUS_PAGES;
  const value = PLAN_CATALOG[tier].features.statusPages;
  return value === "unlimited" ? Infinity : Number(value);
}
