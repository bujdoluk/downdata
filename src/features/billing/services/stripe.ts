import Stripe from "stripe";
import type { BillingInterval, PlanTier } from "@/types/subscription";

// Lazy, server-only client — same shape as lib/resend.ts's
// getResendClient(). No apiVersion pin: the installed "stripe" package
// (exact-pinned in package.json) already targets one fixed API version
// internally, so pinning here would just be a second copy of the same
// string to keep in sync.
export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY must be set.");
  }
  return new Stripe(key);
}

// One env var per sellable tier × interval — see lib/plans.ts's
// PLAN_CATALOG for which tiers are actually purchasable right now
// (business has none of these set, matching `available: false`).
const PRICE_ENV_VARS: Record<PlanTier, Partial<Record<BillingInterval, string>>> = {
  starter: { month: "STRIPE_PRICE_STARTER_MONTHLY", year: "STRIPE_PRICE_STARTER_YEARLY" },
  pro: { month: "STRIPE_PRICE_PRO_MONTHLY", year: "STRIPE_PRICE_PRO_YEARLY" },
  business: {},
};

export function resolvePriceId(plan: PlanTier, interval: BillingInterval): string | null {
  const envVar = PRICE_ENV_VARS[plan][interval];
  return envVar ? (process.env[envVar] ?? null) : null;
}

// The inverse lookup, for the webhook handler: given the price id on an
// incoming subscription, which tier × interval does it belong to. Business
// never matches (no env vars set for it yet), same as resolvePriceId().
export function resolvePlanFromPriceId(priceId: string): { plan: PlanTier; interval: BillingInterval } | null {
  for (const plan of Object.keys(PRICE_ENV_VARS) as PlanTier[]) {
    for (const interval of ["month", "year"] as const) {
      if (resolvePriceId(plan, interval) === priceId) return { plan, interval };
    }
  }
  return null;
}
