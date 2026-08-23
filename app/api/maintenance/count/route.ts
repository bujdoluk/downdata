import { NextResponse } from "next/server";
import { getAllServices } from "@/lib/services";
import { getSupabaseClient } from "@/lib/supabase";

// Head-only count for the sidebar badge — see app/api/incidents/count's
// comment for why this exists instead of reusing getAllStoredMaintenances().
export async function GET() {
  const services = await getAllServices();
  if (services.length === 0) return NextResponse.json({ count: 0 });

  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from("maintenances")
    .select("id", { count: "exact", head: true })
    .in(
      "service_slug",
      services.map((service) => service.slug),
    )
    .eq("status", "in_progress");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ count: count ?? 0 });
}
