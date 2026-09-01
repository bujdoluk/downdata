import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { resolveTimeZone } from "@/lib/account";
import { getSubscription } from "@/lib/subscriptions";
import BillingPageContent from "@/components/billing/BillingPageContent";

export const metadata: Metadata = {
  title: "Billing · downDATA",
};

export default async function BillingPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    subscription,
  ] = await Promise.all([supabase.auth.getUser(), getSubscription()]);

  return (
    <main className="flex flex-1 justify-center p-6">
      <BillingPageContent initialSubscription={subscription} timeZone={resolveTimeZone(user?.user_metadata.time_zone)} />
    </main>
  );
}
