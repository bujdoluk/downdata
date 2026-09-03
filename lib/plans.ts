// The shared tier catalog behind both the public pricing page
// (components/landing-page/PricingSection.tsx) and the dashboard billing
// page (components/billing/BillingPageContent.tsx) — extracted from what
// used to be PricingSection's own local `plans` array so the two pages
// can't drift apart. Client-safe: no Stripe secrets or price ids live
// here (see lib/stripe.ts's resolvePriceId() for that, server-only).
import type { BillingInterval, PlanTier } from "@/types/subscription";

export const ANNUAL_DISCOUNT = 0.2;

// Both rounded to 2 decimals (currency-accurate) — no special-casing beyond that.
export function discountedMonthlyPrice(monthly: number): number {
  return Math.round(monthly * (1 - ANNUAL_DISCOUNT) * 100) / 100;
}

export function annualBilledTotal(monthly: number): number {
  return Math.round(monthly * 12 * (1 - ANNUAL_DISCOUNT) * 100) / 100;
}

type PlanFeatures = {
  monitors: string;
  checkInterval: string;
  statusPages: string | "unlimited";
  teamSeats: "unlimited";
  history: string;
};

export type PlanDefinition = {
  tier: PlanTier;
  monthlyPrice: number | null; // null = no real price yet (business)
  available: boolean; // purchasable via Stripe right now
  badge?: "mostTeams" | "inTheMaking";
  // Set only on the tier(s) that get a trial — drives both the Checkout
  // Session's trial_period_days (see app/api/billing/checkout/route.ts)
  // and the "Start free trial" vs "Get started" CTA copy.
  trialDays?: number;
  features: PlanFeatures;
};

export const PLAN_ORDER: PlanTier[] = ["starter", "pro", "business"];

export const PLAN_CATALOG: Record<PlanTier, PlanDefinition> = {
  starter: {
    tier: "starter",
    monthlyPrice: 19.99,
    available: true,
    trialDays: 14,
    features: { monitors: "50", checkInterval: "15s", statusPages: "2", teamSeats: "unlimited", history: "6 mo" },
  },
  pro: {
    tier: "pro",
    monthlyPrice: 49.99,
    available: true,
    badge: "mostTeams",
    features: { monitors: "250", checkInterval: "10s", statusPages: "5", teamSeats: "unlimited", history: "12 mo" },
  },
  business: {
    tier: "business",
    monthlyPrice: null,
    // Not sellable yet — no Stripe price exists (see lib/stripe.ts's
    // resolvePriceId()). Flip this to true once one does; nothing else
    // here needs to change.
    available: false,
    badge: "inTheMaking",
    features: { monitors: "1,000", checkInterval: "5s", statusPages: "unlimited", teamSeats: "unlimited", history: "24 mo" },
  },
};

export function isBillingInterval(value: string | null): value is BillingInterval {
  return value === "month" || value === "year";
}

export function isPlanTier(value: string | null): value is PlanTier {
  return value === "starter" || value === "pro" || value === "business";
}

// No PLAN_CATALOG entry for "no subscription row" (the free tier — see
// types/subscription.ts) since PLAN_CATALOG only covers purchasable/
// in-the-making tiers. A taste of the status page feature, below
// starter's own quota.
export const FREE_TIER_STATUS_PAGES = 1;

// Resolves a tier's features.statusPages ("2", "5", "unlimited") to a
// comparable number — the one place that string gets parsed, so the enable
// route's quota check and any future display of "X of Y used" agree.
export function statusPageQuota(tier: PlanTier | null): number {
  if (tier === null) return FREE_TIER_STATUS_PAGES;
  const value = PLAN_CATALOG[tier].features.statusPages;
  return value === "unlimited" ? Infinity : Number(value);
}
