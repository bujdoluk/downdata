import { getSupabaseClient } from "@/lib/supabase";

// Marks existing events delivered so a new integration isn't flooded with the backlog.
// excludeOpenIncidents leaves open incidents pending so the next cron cycle sends them.
// Paged: PostgREST silently truncates unpaginated selects at max_rows (1000).
const PAGE_SIZE = 1000;

export async function backfillNewIntegration(integrationId: string, options?: { excludeOpenIncidents?: boolean }): Promise<void> {
  const supabase = getSupabaseClient();
  const ids: (string | number)[] = [];
  let from = 0;
  for (;;) {
    const query = options?.excludeOpenIncidents
      ? supabase.from("incident_events").select("id, incidents!inner(resolved_at)").not("incidents.resolved_at", "is", null)
      : supabase.from("incident_events").select("id");
    const { data } = await query.range(from, from + PAGE_SIZE - 1);
    if (!data?.length) break;
    ids.push(...data.map((row) => row.id));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  if (ids.length === 0) return;

  for (let i = 0; i < ids.length; i += PAGE_SIZE) {
    const chunk = ids.slice(i, i + PAGE_SIZE);
    await supabase.from("incident_event_deliveries").upsert(
      chunk.map((id) => ({ event_id: id, integration_id: integrationId })),
      { onConflict: "event_id,integration_id", ignoreDuplicates: true },
    );
  }
}
