import { createClient } from "@/lib/supabase/server";
import { getSupabaseClient } from "@/lib/supabase";
import { nowIso } from "@/lib/formatTime";
import type { BillingInterval, PlanTier, Subscription } from "@/features/billing/types";

type SubscriptionRow = {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: PlanTier;
  billing_interval: BillingInterval;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

const SELECT_COLUMNS = "stripe_customer_id, stripe_subscription_id, plan, billing_interval, status, current_period_end, cancel_at_period_end";

function toSubscription(row: SubscriptionRow): Subscription {
  return {
    plan: row.plan,
    billingInterval: row.billing_interval,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
  };
}

// null = free tier (no row).
export async function getSubscription(): Promise<Subscription | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("subscriptions").select(SELECT_COLUMNS).maybeSingle();
  if (error) throw error;
  return data ? toSubscription(data as SubscriptionRow) : null;
}

// Reused at checkout so resubscribing doesn't create a second Stripe customer.
export async function getStripeCustomerId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("subscriptions").select("stripe_customer_id").maybeSingle();
  if (error) throw error;
  return (data as { stripe_customer_id: string | null } | null)?.stripe_customer_id ?? null;
}

// Session-scoped so the cancel/resume route can't act on another account.
export async function getOwnStripeSubscriptionId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("subscriptions").select("stripe_subscription_id").maybeSingle();
  if (error) throw error;
  return (data as { stripe_subscription_id: string | null } | null)?.stripe_subscription_id ?? null;
}

// Service-role writes only: subscriptions has no client write policy (0022).

// Webhook-only; the handler has already verified the Stripe signature.
export async function upsertFromStripeEvent(input: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  plan: PlanTier;
  billingInterval: BillingInterval;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: input.userId,
      stripe_customer_id: input.stripeCustomerId,
      stripe_subscription_id: input.stripeSubscriptionId,
      plan: input.plan,
      billing_interval: input.billingInterval,
      status: input.status,
      current_period_end: input.currentPeriodEnd,
      cancel_at_period_end: input.cancelAtPeriodEnd,
      updated_at: nowIso(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

// Fast-path so the UI updates before the webhook reconciles. Caller has
// verified ownership via getOwnStripeSubscriptionId().
export async function applyCancelState(
  userId: string,
  input: { status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean },
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: input.status,
      current_period_end: input.currentPeriodEnd,
      cancel_at_period_end: input.cancelAtPeriodEnd,
      updated_at: nowIso(),
    })
    .eq("user_id", userId);
  if (error) throw error;
}
