import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient, resolvePlanFromPriceId } from "@/features/billing/services/stripe";
import { upsertFromStripeEvent } from "@/features/billing/services/subscriptions";
import { isoFromUnixSeconds } from "@/lib/formatTime";

// Public: Stripe sends no session, so the signature is the authorization.
// Only customer.subscription.* is needed: supabase_user_id metadata (set at checkout) rides on the Subscription.
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

  // Safe: HANDLED_EVENTS narrows to customer.subscription.* events, whose data.object is a Subscription.
  const subscription = event.data.object as Stripe.Subscription;
  const userId = subscription.metadata.supabase_user_id;
  const item = subscription.items.data[0];
  if (!userId || !item) {
    // Subscriptions created outside our checkout (e.g. the Stripe Dashboard) have no owner to attach to.
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
