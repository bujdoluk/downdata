export type PlanTier = "starter" | "pro" | "business";
export type BillingInterval = "month" | "year";

// null (no row in `subscriptions`) means the free tier — mirrors how
// "not connected" is represented for integrations, rather than a
// plan: "free" row of its own.
export type Subscription = {
  plan: PlanTier;
  billingInterval: BillingInterval;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};
