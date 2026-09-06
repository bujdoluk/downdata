import { getSupabaseClient } from "@/lib/supabase";

// Called once, right after a new integration connects. Marks pre-existing
// events as already-delivered to it, so a channel connected long after
// polling started doesn't get flooded with the entire backlog the moment
// it's added — same "don't notify about things that happened before you
// started watching" principle as the first-poll backfill.
//
// excludeOpenIncidents (used only by the SMS connect flow) narrows that:
// backfilling *every* pre-existing event would mean connecting SMS while
// something is actively broken right now silently swallows that incident
// instead of texting about it. Excluding events on a still-open incident
// (incidents.resolved_at is null) leaves them pending, so the very next
// notifyPendingEvents() cron cycle sends the real text — "notify me about
// what's happening right now" without a bespoke immediate-send path.
export async function backfillNewIntegration(integrationId: string, options?: { excludeOpenIncidents?: boolean }): Promise<void> {
  const supabase = getSupabaseClient();
  const query = options?.excludeOpenIncidents
    ? supabase.from("incident_events").select("id, incidents!inner(resolved_at)").not("incidents.resolved_at", "is", null)
    : supabase.from("incident_events").select("id");
  const { data: events } = await query;
  if (!events?.length) return;

  await supabase.from("incident_event_deliveries").upsert(
    events.map((event) => ({ event_id: event.id, integration_id: integrationId })),
    { onConflict: "event_id,integration_id", ignoreDuplicates: true },
  );
}
