import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";
import { applyCancelState, getOwnStripeSubscriptionId } from "@/lib/subscriptions";
import { isoFromUnixSeconds } from "@/lib/formatTime";

// Custom in-app cancel/resume (not Stripe's hosted Customer Portal) —
// toggles cancel_at_period_end on the caller's own subscription. Also
// writes the fresh state to our own row (see applyCancelState) so the UI
// updates immediately; the webhook still fires afterward and reconciles
// the same row from Stripe's own event.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const action = (body as { action?: unknown })?.action;
  if (action !== "cancel" && action !== "resume") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  // Session-scoped, RLS-restricted to the caller's own row — this can
  // never resolve to another account's subscription id.
  const subscriptionId = await getOwnStripeSubscriptionId();
  if (!subscriptionId) {
    return NextResponse.json({ error: "You don't have an active subscription." }, { status: 404 });
  }

  const subscription = await getStripeClient().subscriptions.update(subscriptionId, { cancel_at_period_end: action === "cancel" });
  const item = subscription.items.data[0];
  const currentPeriodEnd = item ? isoFromUnixSeconds(item.current_period_end) : null;

  await applyCancelState(user.id, { status: subscription.status, currentPeriodEnd, cancelAtPeriodEnd: subscription.cancel_at_period_end });

  return NextResponse.json({ status: subscription.status, currentPeriodEnd, cancelAtPeriodEnd: subscription.cancel_at_period_end });
}
