import { NextResponse } from "next/server";
import { getAllTrackedSlugs } from "@/lib/boards";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET() {
  const trackedSlugs = await getAllTrackedSlugs();
  if (trackedSlugs.length === 0) return NextResponse.json({ count: 0 });

  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from("incidents")
    .select("id", { count: "exact", head: true })
    .in("service_slug", trackedSlugs)
    .in("status", ["investigating", "identified"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ count: count ?? 0 });
}
