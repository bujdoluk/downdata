import { NextResponse } from "next/server";
import { getSubscription } from "@/lib/subscriptions";

export async function GET() {
  return NextResponse.json(await getSubscription());
}
