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
//
// Paged via .range() rather than one unbounded select() — PostgREST
// silently caps any unpaginated select at its configured max-rows (1000,
// supabase/config.toml), and incident_events is a global, catalog-wide
// table with no per-account scoping, so real accounts cross that easily.
// This is the exact failure mode getStoredIncident.ts's
// fetchUpdatesForIncidentIds already hit and fixed on incident_updates —
// see that file's own comment. Without paging here, only the first 1000
// pre-existing events ever got marked delivered; everything past that
// stayed "pending" and got sent by the next cron tick as if brand new,
// which is what a freshly connected integration receiving month-old
// incidents actually was.
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

  // Chunked for the same reason as the read above — a several-thousand-row
  // upsert in one request risks the same silent-truncation-shaped surprise
  // on the write side, so this stays bounded per request regardless of how
  // large `ids` grows.
  for (let i = 0; i < ids.length; i += PAGE_SIZE) {
    const chunk = ids.slice(i, i + PAGE_SIZE);
    await supabase.from("incident_event_deliveries").upsert(
      chunk.map((id) => ({ event_id: id, integration_id: integrationId })),
      { onConflict: "event_id,integration_id", ignoreDuplicates: true },
    );
  }
}
