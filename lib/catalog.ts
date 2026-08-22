import { getSupabaseClient } from "@/lib/supabase";
import type { CatalogEntry } from "@/types/service";

export async function getCatalog(): Promise<CatalogEntry[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("catalog").select("slug, name, host, category").order("name");
  if (error) throw error;
  return data ?? [];
}
