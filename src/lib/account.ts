// Plain, isomorphic TypeScript — no "use client" — imported from both the
// server (app/(dashboard)/account/page.tsx's resolveTimeZone call) and the
// client (fetchAccount in lib/useTimeZone.ts / Sidebar.tsx).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Account } from "@/types/account";

const VALID_TIME_ZONES = new Set(Intl.supportedValuesOf("timeZone"));

// Never trust user_metadata.time_zone blindly — it's editable directly via
// the Supabase dashboard/API outside this app's own write path (which only
// ever offers real Intl.supportedValuesOf entries), and a malformed IANA id
// would otherwise throw an uncaught RangeError out of Temporal on every
// single date render.
export function resolveTimeZone(raw: unknown): string {
  return typeof raw === "string" && VALID_TIME_ZONES.has(raw) ? raw : "UTC";
}

export async function fetchAccount(supabase: SupabaseClient): Promise<Account | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const avatarUrl = data.user.user_metadata.avatar_url ?? data.user.user_metadata.picture ?? null;
  const timeZone = resolveTimeZone(data.user.user_metadata.time_zone);
  return { id: data.user.id, email: data.user.email ?? "", avatarUrl, timeZone } satisfies Account;
}
