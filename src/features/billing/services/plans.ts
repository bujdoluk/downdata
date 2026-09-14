// The shared tier catalog behind both the public pricing page
// (components/landing-page/PricingSection.tsx) and the dashboard billing
// page (components/billing/BillingPageContent.tsx) — extracted from what
// used to be PricingSection's own local `plans` array so the two pages
// can't drift apart. Client-safe: no Stripe secrets or price ids live
// here (see lib/stripe.ts's resolvePriceId() for that, server-only).
import type { BillingInterval, PlanTier } from "@/features/billing/types";

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
  boards: string | "unlimited";
  statusPages: string | "unlimited";
  adminUsers: string | "unlimited";
  history: string;
  // Free-text on purpose, not an enumerated list — "All" is deliberately
  // vague so it doesn't need editing every time a new integration provider
  // ships (see the spec's own note on why Growth/Team/Business never spell
  // out slack/email/sms/webhook by name).
  integrations: string;
};

export type PlanDefinition = {
  tier: PlanTier;
  monthlyPrice: number;
  available: boolean; // purchasable via Stripe right now
  badge?: "mostTeams" | "inTheMaking";
  // Set only on the tier(s) that get a trial — drives both the Checkout
  // Session's trial_period_days (see app/api/billing/checkout/route.ts)
  // and the "Start free trial" vs "Get started" CTA copy.
  trialDays?: number;
  features: PlanFeatures;
};

// "free" is deliberately first and excluded from anything checkout-shaped
// (see PricingSection.tsx's own bespoke Free/Team card blocks) — it exists
// in this catalog purely so the pricing page has one data source for all
// five cards, not because a `subscriptions` row is ever created for it (a
// missing row already means free, see types/subscription.ts).
export const PLAN_ORDER: PlanTier[] = ["free", "starter", "growth", "team", "business"];

export const PLAN_CATALOG: Record<PlanTier, PlanDefinition> = {
  free: {
    tier: "free",
    monthlyPrice: 0,
    // No Stripe price and no checkout round trip at all — the CTA links
    // straight to /login instead of /billing?plan=free.
    available: false,
    features: { monitors: "3", checkInterval: "10m", boards: "1", statusPages: "0", adminUsers: "1", history: "1 mo", integrations: "Slack, Email" },
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
    // No Stripe price yet — same disabled/waitlist treatment as business.
    // trialDays is set anyway so the moment this does get a real price, the
    // trial is already configured correctly — nothing here to remember to
    // add later. Team's own card renders a disabled "Get notified" button
    // regardless (see PricingSection.tsx), so this has no visible effect
    // yet.
    available: false,
    badge: "mostTeams",
    trialDays: 14,
    features: { monitors: "75", checkInterval: "1m", boards: "5", statusPages: "5", adminUsers: "5", history: "12 mo", integrations: "All" },
  },
  business: {
    tier: "business",
    monthlyPrice: 174.99,
    // Real price now known, but still not sellable — no Stripe price
    // exists (see lib/stripe.ts's resolvePriceId()). Flip this to true
    // once one does; nothing else here needs to change. Same forward-set
    // trialDays reasoning as team's, above.
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

// No PLAN_CATALOG entry for "no subscription row" (the free tier — see
// types/subscription.ts) since a real `subscriptions` row is never created
// for it (the "free" PLAN_CATALOG entry above is display-only, read by the
// pricing page, not by this function). Kept in sync with
// PLAN_CATALOG.free.features.statusPages by convention, not by code.
export const FREE_TIER_STATUS_PAGES = 0;

// Resolves a tier's features.statusPages ("2", "5", "unlimited") to a
// comparable number — the one place that string gets parsed, so the enable
// route's quota check and any future display of "X of Y used" agree.
export function statusPageQuota(tier: PlanTier | null): number {
  if (tier === null) return FREE_TIER_STATUS_PAGES;
  const value = PLAN_CATALOG[tier].features.statusPages;
  return value === "unlimited" ? Infinity : Number(value);
}
