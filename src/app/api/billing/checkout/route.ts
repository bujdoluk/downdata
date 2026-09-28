import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient, resolvePriceId } from "@/features/billing/services/stripe";
import { getStripeCustomerId } from "@/features/billing/services/subscriptions";
import { isBillingInterval, isPlanTier, PLAN_CATALOG } from "@/features/billing/services/plans";

// No payment_method_types: Stripe picks eligible methods from Dashboard settings.
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

  // Reuse the existing customer so resubscribing doesn't create a duplicate.
  const existingCustomerId = await getStripeCustomerId();
  // "if_required" makes the trial card-free, matching the landing page's "no credit card required".
  const trialDays = PLAN_CATALOG[plan].trialDays;
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    // Propagates onto the Subscription, so customer.subscription.* webhooks self-identify the owner.
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
