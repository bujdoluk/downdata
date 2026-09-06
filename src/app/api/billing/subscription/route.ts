import { NextResponse } from "next/server";
import { getSubscription } from "@/features/billing/services/subscriptions";

export async function GET() {
  return NextResponse.json(await getSubscription());
}
