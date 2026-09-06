-- incident.io-hosted status pages (e.g. status.brevo.com) never send a
-- deliver_notifications field on an incident/maintenance update — Atlassian
-- always does. jsonb_to_recordset (see 0007_bulk_upsert_functions.sql)
-- reads a missing key as SQL NULL, and incident_updates/maintenance_updates
-- both declare deliver_notifications boolean not null default false — so
-- inserting that NULL throws a not-null violation, caught per-row by the
-- bulk function's exception block and counted as a failure.
--
-- That failure count is what silently broke everything downstream for
-- Brevo: pollIncidents.ts's backfillIfFirstPoll() only inserts a
-- polled_services row when a poll completes with zero failures, so it
-- never ran; with no polled_services row, trackedSince stays null
-- everywhere it's read; and OutageTracker's buildOutageTrackerDays()
-- marks every single day "not tracked" when trackedSince is null — hiding
-- every incident from the 30-day tracker strip, even ones correctly
-- stored and visible in the Incidents tab.
--
-- Fix: default the missing field to false instead of passing NULL
-- through. Self-healing, not a data migration — the incident_updates rows
-- that have been failing to insert simply don't exist yet (no conflict to
-- resolve), so the very next poll cycle after this ships will insert them
-- for real, bring a poll's failure count to zero, and let
-- backfillIfFirstPoll finally seed polled_services for Brevo (and any
-- other incident.io-hosted service in the catalog — this isn't
-- Brevo-specific, it's a property of the incident.io shape).

create or replace function upsert_incident_update(
  p_service_slug text, p_incident_id text, p_id text, p_status text, p_body text,
  p_affected_components jsonb, p_created_at timestamptz, p_updated_at timestamptz,
  p_display_at timestamptz, p_deliver_notifications boolean, p_custom_tweet text, p_tweet_id text
) returns void as $$
  insert into incident_updates (service_slug, incident_id, id, status, body, affected_components, created_at, updated_at, display_at, deliver_notifications, custom_tweet, tweet_id)
  values (p_service_slug, p_incident_id, p_id, p_status, p_body, p_affected_components, p_created_at, p_updated_at, p_display_at, coalesce(p_deliver_notifications, false), p_custom_tweet, p_tweet_id)
  on conflict (service_slug, incident_id, id) do update
    set status = excluded.status, body = excluded.body, affected_components = excluded.affected_components,
        updated_at = excluded.updated_at, display_at = excluded.display_at,
        deliver_notifications = excluded.deliver_notifications, custom_tweet = excluded.custom_tweet, tweet_id = excluded.tweet_id
  where incident_updates.updated_at is distinct from excluded.updated_at;
$$ language sql;
comment on function upsert_incident_update is 'Insert/update one incident update''s current state; a true no-op write when nothing actually changed. deliver_notifications defaults to false when the upstream feed omits it (incident.io never sends it).';

create or replace function upsert_maintenance_update(
  p_service_slug text, p_maintenance_id text, p_id text, p_status text, p_body text,
  p_affected_components jsonb, p_created_at timestamptz, p_updated_at timestamptz,
  p_display_at timestamptz, p_deliver_notifications boolean, p_custom_tweet text, p_tweet_id text
) returns void as $$
  insert into maintenance_updates (service_slug, maintenance_id, id, status, body, affected_components, created_at, updated_at, display_at, deliver_notifications, custom_tweet, tweet_id)
  values (p_service_slug, p_maintenance_id, p_id, p_status, p_body, p_affected_components, p_created_at, p_updated_at, p_display_at, coalesce(p_deliver_notifications, false), p_custom_tweet, p_tweet_id)
  on conflict (service_slug, maintenance_id, id) do update
    set status = excluded.status, body = excluded.body, affected_components = excluded.affected_components,
        updated_at = excluded.updated_at, display_at = excluded.display_at,
        deliver_notifications = excluded.deliver_notifications, custom_tweet = excluded.custom_tweet, tweet_id = excluded.tweet_id
  where maintenance_updates.updated_at is distinct from excluded.updated_at;
$$ language sql;
comment on function upsert_maintenance_update is 'Insert/update one maintenance update''s current state; a true no-op write when nothing actually changed. deliver_notifications defaults to false when the upstream feed omits it (incident.io never sends it).';
