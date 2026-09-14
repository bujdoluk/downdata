import Stripe from "stripe";
import type { BillingInterval, PlanTier } from "@/features/billing/types";

export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY must be set.");
  }
  return new Stripe(key);
}

const PRICE_ENV_VARS: Record<PlanTier, Partial<Record<BillingInterval, string>>> = {
  free: {},
  starter: { month: "STRIPE_PRICE_STARTER_MONTHLY", year: "STRIPE_PRICE_STARTER_YEARLY" },
  growth: { month: "STRIPE_PRICE_GROWTH_MONTHLY", year: "STRIPE_PRICE_GROWTH_YEARLY" },
  team: { month: "STRIPE_PRICE_TEAM_MONTHLY", year: "STRIPE_PRICE_TEAM_YEARLY" },
  business: {},
};

export function resolvePriceId(plan: PlanTier, interval: BillingInterval): string | null {
  const envVar = PRICE_ENV_VARS[plan][interval];
  return envVar ? (process.env[envVar] ?? null) : null;
}

export function resolvePlanFromPriceId(priceId: string): { plan: PlanTier; interval: BillingInterval } | null {
  for (const plan of Object.keys(PRICE_ENV_VARS) as PlanTier[]) {
    for (const interval of ["month", "year"] as const) {
      if (resolvePriceId(plan, interval) === priceId) return { plan, interval };
    }
  }
  return null;
}
