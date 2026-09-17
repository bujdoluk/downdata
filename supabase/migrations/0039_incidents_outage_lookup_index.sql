-- fetchOutagesLast24h (lib/statusBatch.ts, called on every /monitors and
-- /monitors/[slug] load via fetchStatusBatch) filters incidents by
-- impact = any(['major','critical']) and created_at >= (24h ago), with no
-- supporting index — incidents only has its primary key (service_slug, id)
-- and incidents_updated_at_idx (updated_at desc), neither of which helps
-- impact/created_at at all. Confirmed live via Supabase's own Postgres
-- logs: "canceling statement due to statement timeout" (57014) on exactly
-- this query shape, now that incidents (an upserted "current state" table
-- that's never pruned) has grown large enough for the missing index to
-- matter. Same failure mode, same fix shape, as
-- 0012_add_incident_events_service_slug_index.sql on a sibling table.
--
-- impact leads created_at (equality/IN column before the range column —
-- see that file's own reasoning), and service_slug is INCLUDEd rather than
-- a third key column: once impact+created_at narrows the match set to a
-- handful of rows, an index-only scan for the one selected column
-- (service_slug) is enough, and service_slug's own high cardinality
-- wouldn't further narrow a btree range scan here anyway.
create index incidents_outage_impact_created_idx
  on incidents (impact, created_at desc)
  include (service_slug);
