import { NextResponse } from "next/server";
import { getAllServices } from "@/lib/services";
import { getSupabaseClient } from "@/lib/supabase";

// Head-only count for the sidebar badge — deliberately not
// getAllStoredIncidents(), which pulls every incident's full update
// history (unbounded text bodies) just to let the caller filter for a
// number. Polled globally on a 60s interval by every dashboard page
// (see Sidebar.tsx), so its payload size directly drives Supabase egress.
export async function GET() {
  const services = await getAllServices();
  if (services.length === 0) return NextResponse.json({ count: 0 });

  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from("incidents")
    .select("id", { count: "exact", head: true })
    .in(
      "service_slug",
      services.map((service) => service.slug),
    )
    .in("status", ["investigating", "identified"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ count: count ?? 0 });
}
