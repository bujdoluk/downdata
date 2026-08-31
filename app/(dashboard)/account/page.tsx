import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAllBoards, getAllTrackedSlugs } from "@/lib/boards";
import { getAllIntegrations } from "@/lib/integrations";
import { resolveTimeZone } from "@/lib/account";
import AccountPageContent from "@/components/account/AccountPageContent";

export const metadata: Metadata = {
  title: "Account · downDATA",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    boards,
    trackedSlugs,
    integrations,
  ] = await Promise.all([supabase.auth.getUser(), getAllBoards(), getAllTrackedSlugs(), getAllIntegrations()]);

  return (
    <main className="flex flex-1 justify-center p-6">
      <AccountPageContent
        userId={user?.id ?? ""}
        email={user?.email ?? ""}
        avatarUrl={user?.user_metadata.avatar_url ?? user?.user_metadata.picture ?? null}
        timeZone={resolveTimeZone(user?.user_metadata.time_zone)}
        createdAt={user?.created_at ?? null}
        lastSignInAt={user?.last_sign_in_at ?? null}
        provider={user?.app_metadata.provider ?? "email"}
        boardCount={boards.length}
        trackedCount={trackedSlugs.length}
        integrationCount={integrations.length}
      />
    </main>
  );
}
