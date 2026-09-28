export type PlanTier = "free" | "starter" | "growth" | "team" | "business";
export type BillingInterval = "month" | "year";

// null (no row) = free tier; there's no "free" row.
export type Subscription = {
  plan: PlanTier;
  billingInterval: BillingInterval;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};
