import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient, resolvePlanFromPriceId } from "@/lib/stripe";
import { upsertFromStripeEvent } from "@/lib/subscriptions";
import { isoFromUnixSeconds } from "@/lib/formatTime";

// Public route (see proxy.ts's PUBLIC_EXACT) — Stripe carries no session
// cookie, so the webhook signature itself is the authorization, the same
// pattern as /api/integrations/email/verify's token. Never call this from
// a user-facing code path.
//
// Subscribed to customer.subscription.* only, not checkout.session.completed
// — subscription_data.metadata.supabase_user_id (set at Checkout Session
// creation, see app/api/billing/checkout/route.ts) propagates onto the
// Subscription object itself, so every subscription event self-identifies
// its owner without needing to correlate back to a checkout session.
const HANDLED_EVENTS = new Set(["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"]);

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  // Safe — HANDLED_EVENTS above narrows event.type to the three
  // customer.subscription.* events, whose data.object is always a
  // Stripe.Subscription.
  const subscription = event.data.object as Stripe.Subscription;
  const userId = subscription.metadata.supabase_user_id;
  const item = subscription.items.data[0];
  if (!userId || !item) {
    // A subscription created outside this app's own checkout flow (e.g.
    // directly in the Dashboard) carries no supabase_user_id — nothing to
    // attach it to.
    return NextResponse.json({ received: true });
  }

  const resolved = resolvePlanFromPriceId(item.price.id);
  if (!resolved) {
    return NextResponse.json({ received: true });
  }

  await upsertFromStripeEvent({
    userId,
    stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
    stripeSubscriptionId: subscription.id,
    plan: resolved.plan,
    billingInterval: resolved.interval,
    status: subscription.status,
    currentPeriodEnd: isoFromUnixSeconds(item.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  return NextResponse.json({ received: true });
}
