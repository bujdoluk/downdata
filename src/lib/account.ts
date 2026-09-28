// Isomorphic: imported by both server and client.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Account } from "@/types/account";

const VALID_TIME_ZONES = new Set(Intl.supportedValuesOf("timeZone"));

// user_metadata is editable outside this app, and a malformed IANA id would throw on every render.
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
