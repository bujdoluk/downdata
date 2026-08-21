import { getSupabaseClient } from "@/lib/supabase";

// Called once, right after a new integration connects. Marks all
// pre-existing events as already-delivered to it, so a channel connected
// long after polling started doesn't get flooded with the entire backlog
// the moment it's added — same "don't notify about things that happened
// before you started watching" principle as the first-poll backfill.
export async function backfillNewIntegration(integrationSlug: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: events } = await supabase.from("incident_events").select("id");
  if (!events?.length) return;

  await supabase.from("incident_event_deliveries").upsert(
    events.map((event) => ({ event_id: event.id, integration_slug: integrationSlug })),
    { onConflict: "event_id,integration_slug", ignoreDuplicates: true },
  );
}
