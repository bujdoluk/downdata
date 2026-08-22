-- Scheduled maintenance windows, stored the same way incidents are
-- (0001_create_incidents.sql) — polled catalog-wide by the same cron cycle,
-- read back tracked-only for /api/maintenance. No events/notification
-- tables here (unlike incidents) — nothing notifies about maintenances.
-- Run this once, same as 0001-0004.

-- Current state of one scheduled maintenance window, upserted in place.
-- Statuspage models a maintenance as an incident-shaped object plus a
-- scheduling window, hence the same column set as `incidents` plus
-- scheduled_for/scheduled_until.
create table maintenances (
  service_slug text not null,
  id text not null,
  name text not null,
  status text not null,
  impact text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  monitoring_at timestamptz,
  resolved_at timestamptz,
  scheduled_for timestamptz not null,
  scheduled_until timestamptz not null,
  shortlink text,
  components jsonb,
  primary key (service_slug, id)
);
comment on table maintenances is 'Current state of each scheduled maintenance window (upserted, one row per maintenance) — not a history of polls.';
alter table maintenances enable row level security;

-- Current state of one update within a maintenance's timeline. Statuspage's
-- own API calls this array `incident_updates` even for maintenance objects.
create table maintenance_updates (
  service_slug text not null,
  maintenance_id text not null,
  id text not null,
  status text not null,
  body text not null,
  affected_components jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  display_at timestamptz,
  deliver_notifications boolean not null default false,
  custom_tweet text,
  tweet_id text,
  primary key (service_slug, maintenance_id, id),
  foreign key (service_slug, maintenance_id) references maintenances (service_slug, id) on delete cascade
);
comment on table maintenance_updates is 'Current state of each update within a maintenance''s timeline — upserted, one row per update.';
alter table maintenance_updates enable row level security;

create index maintenances_scheduled_for_idx on maintenances (scheduled_for);

-- Insert/update one maintenance's current state — same no-op-when-unchanged
-- shape as upsert_incident.
create or replace function upsert_maintenance(
  p_service_slug text, p_id text, p_name text, p_status text, p_impact text,
  p_created_at timestamptz, p_updated_at timestamptz, p_monitoring_at timestamptz,
  p_resolved_at timestamptz, p_scheduled_for timestamptz, p_scheduled_until timestamptz,
  p_shortlink text, p_components jsonb
) returns void as $$
  insert into maintenances (service_slug, id, name, status, impact, created_at, updated_at, monitoring_at, resolved_at, scheduled_for, scheduled_until, shortlink, components)
  values (p_service_slug, p_id, p_name, p_status, p_impact, p_created_at, p_updated_at, p_monitoring_at, p_resolved_at, p_scheduled_for, p_scheduled_until, p_shortlink, p_components)
  on conflict (service_slug, id) do update
    set name = excluded.name, status = excluded.status, impact = excluded.impact,
        monitoring_at = excluded.monitoring_at, resolved_at = excluded.resolved_at,
        scheduled_for = excluded.scheduled_for, scheduled_until = excluded.scheduled_until,
        updated_at = excluded.updated_at, components = excluded.components
    where maintenances.updated_at is distinct from excluded.updated_at
       or maintenances.status is distinct from excluded.status
       or maintenances.scheduled_until is distinct from excluded.scheduled_until;
$$ language sql;
comment on function upsert_maintenance is 'Insert/update one maintenance''s current state; a true no-op write when nothing actually changed.';

-- Same idea, one level down: insert or update one update within a
-- maintenance's timeline, only writing when it changed.
create or replace function upsert_maintenance_update(
  p_service_slug text, p_maintenance_id text, p_id text, p_status text, p_body text,
  p_affected_components jsonb, p_created_at timestamptz, p_updated_at timestamptz,
  p_display_at timestamptz, p_deliver_notifications boolean, p_custom_tweet text, p_tweet_id text
) returns void as $$
  insert into maintenance_updates (service_slug, maintenance_id, id, status, body, affected_components, created_at, updated_at, display_at, deliver_notifications, custom_tweet, tweet_id)
  values (p_service_slug, p_maintenance_id, p_id, p_status, p_body, p_affected_components, p_created_at, p_updated_at, p_display_at, p_deliver_notifications, p_custom_tweet, p_tweet_id)
  on conflict (service_slug, maintenance_id, id) do update
    set status = excluded.status, body = excluded.body, affected_components = excluded.affected_components,
        updated_at = excluded.updated_at, display_at = excluded.display_at,
        deliver_notifications = excluded.deliver_notifications, custom_tweet = excluded.custom_tweet, tweet_id = excluded.tweet_id
  where maintenance_updates.updated_at is distinct from excluded.updated_at;
$$ language sql;
comment on function upsert_maintenance_update is 'Insert/update one maintenance update''s current state; a true no-op write when nothing actually changed.';
