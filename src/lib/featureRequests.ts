import { getSupabaseClient } from "@/lib/supabase";

// No RLS policies exist for this table at all (see
// 0023_feature_requests.sql) — the client never touches it directly, only
// this one service-role write from app/api/requests/route.ts.
export async function submitFeatureRequest(input: { kind: "service" | "integration"; message: string; userId: string | null }): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("feature_requests").insert({ kind: input.kind, message: input.message, user_id: input.userId });
  if (error) throw error;
}
