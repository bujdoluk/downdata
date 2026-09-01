import { createClient } from "@/lib/supabase/server";
import { getSupabaseClient } from "@/lib/supabase";
import { nowIso } from "@/lib/formatTime";
import type { BillingInterval, PlanTier, Subscription } from "@/types/subscription";

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

// The current user's own subscription — null means the free tier (no
// row), the same convention lib/integrations.ts uses for "not connected".
export async function getSubscription(): Promise<Subscription | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("subscriptions").select(SELECT_COLUMNS).maybeSingle();
  if (error) throw error;
  return data ? toSubscription(data as SubscriptionRow) : null;
}

// Existing Stripe customer id for the current user, if any — checkout
// reuses it so resubscribing after a cancellation doesn't leave Stripe
// with two customer records for the same account.
export async function getStripeCustomerId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("subscriptions").select("stripe_customer_id").maybeSingle();
  if (error) throw error;
  return (data as { stripe_customer_id: string | null } | null)?.stripe_customer_id ?? null;
}

// The caller's own Stripe subscription id, for the cancel/resume route —
// session-scoped read, RLS-restricted to the caller's own row, so that
// route can never act on another account's subscription.
export async function getOwnStripeSubscriptionId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("subscriptions").select("stripe_subscription_id").maybeSingle();
  if (error) throw error;
  return (data as { stripe_subscription_id: string | null } | null)?.stripe_subscription_id ?? null;
}

// --- Service-role write paths ------------------------------------------
//
// subscriptions has no insert/update policy for `authenticated` (see
// 0022_create_subscriptions.sql) — every write below runs through the
// service-role client, never in direct response to a raw client request.

// Upserts the full row from a Stripe `customer.subscription.*` event.
// Called only by the webhook handler (app/api/billing/webhook/route.ts),
// which has already verified the event's signature.
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

// Fast-path write right after a cancel/resume API call succeeds, so the
// UI reflects it immediately without waiting on the webhook round-trip —
// the webhook still fires afterward and reconciles the same row from
// Stripe's own event; this is a snappier first write, not a second
// source of truth. The caller (app/api/billing/cancel/route.ts) has
// already verified the subscription id belongs to this userId via the
// session-scoped getOwnStripeSubscriptionId() before reaching here.
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
