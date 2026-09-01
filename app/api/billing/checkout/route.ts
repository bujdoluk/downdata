import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient, resolvePriceId } from "@/lib/stripe";
import { getStripeCustomerId } from "@/lib/subscriptions";
import { isBillingInterval, isPlanTier, PLAN_CATALOG } from "@/lib/plans";

// Starts a subscription Checkout Session for the caller's chosen plan.
// Never includes payment_method_types — Stripe determines eligible
// payment methods dynamically from Dashboard settings.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const plan = (body as { plan?: unknown })?.plan;
  const interval = (body as { interval?: unknown })?.interval;
  if (typeof plan !== "string" || !isPlanTier(plan) || typeof interval !== "string" || !isBillingInterval(interval)) {
    return NextResponse.json({ error: "That plan isn't available." }, { status: 400 });
  }
  if (!PLAN_CATALOG[plan].available) {
    return NextResponse.json({ error: "That plan isn't available yet." }, { status: 400 });
  }

  const priceId = resolvePriceId(plan, interval);
  const appUrl = process.env.APP_URL;
  if (!priceId || !appUrl) {
    return NextResponse.json({ error: "Billing isn't configured yet." }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  // Reuses the account's existing Stripe customer if it has one (e.g.
  // resubscribing after a cancellation), rather than letting Stripe
  // create a second customer record for the same account.
  const existingCustomerId = await getStripeCustomerId();
  // Only Starter carries a trial right now (PLAN_CATALOG.starter.trialDays).
  // payment_method_collection: "if_required" is what actually makes it
  // card-free — Stripe's default still collects a card during a trial and
  // auto-charges when it ends, which would contradict the landing page's
  // "no credit card required" copy.
  const trialDays = PLAN_CATALOG[plan].trialDays;
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    // Propagates onto the created Subscription object itself, so the
    // webhook can identify the owner from customer.subscription.* events
    // alone — see lib/subscriptions.ts's upsertFromStripeEvent().
    subscription_data: {
      metadata: { supabase_user_id: user.id },
      ...(trialDays ? { trial_period_days: trialDays } : {}),
    },
    ...(trialDays ? { payment_method_collection: "if_required" as const } : {}),
    success_url: `${appUrl}/billing?checkout=success`,
    cancel_url: `${appUrl}/billing?checkout=canceled`,
  };
  if (existingCustomerId) {
    params.customer = existingCustomerId;
  } else if (user.email) {
    params.customer_email = user.email;
  }

  const session = await getStripeClient().checkout.sessions.create(params);
  if (!session.url) {
    return NextResponse.json({ error: "Couldn't start checkout. Try again." }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
