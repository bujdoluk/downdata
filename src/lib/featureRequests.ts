import { getSupabaseClient } from "@/lib/supabase";

// Table has no RLS policies (0023), so only this service-role write touches it.
export async function submitFeatureRequest(input: { kind: "service" | "integration"; message: string; userId: string | null }): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("feature_requests").insert({ kind: input.kind, message: input.message, user_id: input.userId });
  if (error) throw error;
}
