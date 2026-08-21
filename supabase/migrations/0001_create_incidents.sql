-- Run this once in the Supabase project's SQL editor (or via the Supabase
-- CLI, if this project ever adopts it — the supabase/migrations/ naming
-- is already the shape it expects). Future schema changes should be new
-- numbered files here (0002_..., 0003_...), not edits to this one — plain
-- `create table` isn't idempotent the way the `create or replace function`
-- statements below are, so this file is a one-time-apply unit, not
-- something safe to just re-run wholesale after it's already been applied.
-- The one exception: the `insert` seed row at the bottom (the lock
-- table's singleton) — skip that specific line on a re-run.

-- Current state of one incident, upserted in place. One row per incident
-- (keyed by service + Statuspage's own id), never duplicated per poll —
-- this table always reflects "what's true right now," not history.
create table incidents (
  service_slug text not null,
  id text not null,
  name text not null,
  status text not null,
  impact text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  monitoring_at timestamptz,
  resolved_at timestamptz,
  shortlink text,
  components jsonb,
  primary key (service_slug, id)
);
comment on table incidents is 'Current state of each tracked incident (upserted, one row per incident) — not a history of polls.';
-- No policies: this app only ever connects with the service_role key
-- (which bypasses RLS entirely), so RLS here just means anon/authenticated
-- get zero access by default instead of the implicit full access an
-- RLS-disabled table would otherwise grant them.
alter table incidents enable row level security;

-- Current state of one status update within an incident's timeline.
-- Same upsert-in-place idea as incidents, one level down.
create table incident_updates (
  service_slug text not null,
  incident_id text not null,
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
  primary key (service_slug, incident_id, id),
  foreign key (service_slug, incident_id) references incidents (service_slug, id) on delete cascade
);
comment on table incident_updates is 'Current state of each update within an incident''s timeline — upserted, one row per update.';
alter table incident_updates enable row level security;

-- Append-only log of "this just happened" — never upserted, only ever
-- inserted. Populated automatically by the two triggers below; nothing
-- writes here directly.
create table incident_events (
  id bigint generated always as identity primary key,
  service_slug text not null,
  incident_id text not null,
  update_id text,
  event_type text not null check (event_type in ('incident_created', 'update_added')),
  occurred_at timestamptz not null default now(),
  foreign key (service_slug, incident_id) references incidents (service_slug, id) on delete cascade
);
comment on table incident_events is 'Append-only history of new incidents/updates, auto-populated by triggers. Powers "New" detection and notifications.';
alter table incident_events enable row level security;

-- Which notification channel has already been told about which event.
-- Scoped per integration_slug so channels can never interfere with
-- each other's delivery state.
create table incident_event_deliveries (
  event_id bigint not null references incident_events (id) on delete cascade,
  integration_slug text not null,
  delivered_at timestamptz not null default now(),
  primary key (event_id, integration_slug)
);
comment on table incident_event_deliveries is 'Per-channel record of which incident_events row has been sent where — the retry/outbox mechanism.';
alter table incident_event_deliveries enable row level security;

-- Tracks which services have had at least one poll, so only the very
-- first poll of a service gets backfill treatment (its pre-existing
-- history won't flood notification channels) — every poll after that
-- behaves normally.
create table polled_services (
  service_slug text primary key,
  first_polled_at timestamptz not null default now()
);
comment on table polled_services is 'First-poll marker per service, used to suppress notifying about pre-existing history on a service''s first poll.';
alter table polled_services enable row level security;

-- Singleton row (id is always `true`) tracking whether a poll/notify cycle
-- is currently running. Claimed and released via atomic UPDATEs, not a
-- session-scoped advisory lock, because PostgREST doesn't guarantee the
-- same underlying connection across separate requests.
create table poll_run_lock (
  id boolean primary key default true,
  running boolean not null default false,
  started_at timestamptz
);
comment on table poll_run_lock is 'Singleton row preventing two poll/notify cycles from running at once; self-heals after 5 minutes if a run crashed without releasing.';
alter table poll_run_lock enable row level security;

create index incidents_updated_at_idx on incidents (updated_at desc);
create index incident_events_occurred_at_idx on incident_events (occurred_at desc);
-- No secondary index on incident_event_deliveries: the notifier queries by
-- event_id (a batched "WHERE event_id IN (...)"), which the primary key
-- (event_id, integration_slug) already covers since event_id is its first
-- column — a separate (integration_slug, event_id) index would only have
-- served an older per-integration query shape this design doesn't use.

-- Insert a new incident, or update an existing one — but only actually
-- write when something changed (name/status/impact/resolved_at/components).
-- An unchanged incident costs a no-op: no row rewrite, no trigger fires.
create or replace function upsert_incident(
  p_service_slug text, p_id text, p_name text, p_status text, p_impact text,
  p_created_at timestamptz, p_updated_at timestamptz, p_monitoring_at timestamptz,
  p_resolved_at timestamptz, p_shortlink text, p_components jsonb
) returns void as $$
  insert into incidents (service_slug, id, name, status, impact, created_at, updated_at, monitoring_at, resolved_at, shortlink, components)
  values (p_service_slug, p_id, p_name, p_status, p_impact, p_created_at, p_updated_at, p_monitoring_at, p_resolved_at, p_shortlink, p_components)
  on conflict (service_slug, id) do update
    set name = excluded.name, status = excluded.status, impact = excluded.impact,
        monitoring_at = excluded.monitoring_at, resolved_at = excluded.resolved_at,
        updated_at = excluded.updated_at, components = excluded.components
    where incidents.updated_at is distinct from excluded.updated_at
       or incidents.components is distinct from excluded.components;
$$ language sql;
comment on function upsert_incident is 'Insert/update one incident''s current state; a true no-op write when nothing actually changed.';

-- Same idea as upsert_incident, one level down: insert or update one
-- update within an incident's timeline, only writing when it changed.
create or replace function upsert_incident_update(
  p_service_slug text, p_incident_id text, p_id text, p_status text, p_body text,
  p_affected_components jsonb, p_created_at timestamptz, p_updated_at timestamptz,
  p_display_at timestamptz, p_deliver_notifications boolean, p_custom_tweet text, p_tweet_id text
) returns void as $$
  insert into incident_updates (service_slug, incident_id, id, status, body, affected_components, created_at, updated_at, display_at, deliver_notifications, custom_tweet, tweet_id)
  values (p_service_slug, p_incident_id, p_id, p_status, p_body, p_affected_components, p_created_at, p_updated_at, p_display_at, p_deliver_notifications, p_custom_tweet, p_tweet_id)
  on conflict (service_slug, incident_id, id) do update
    set status = excluded.status, body = excluded.body, affected_components = excluded.affected_components,
        updated_at = excluded.updated_at, display_at = excluded.display_at,
        deliver_notifications = excluded.deliver_notifications, custom_tweet = excluded.custom_tweet, tweet_id = excluded.tweet_id
  where incident_updates.updated_at is distinct from excluded.updated_at;
$$ language sql;
comment on function upsert_incident_update is 'Insert/update one incident update''s current state; a true no-op write when nothing actually changed.';

-- Trigger function: runs automatically the instant a brand-new incident
-- row is actually inserted (never on an update, and never on a no-op).
create or replace function log_incident_created() returns trigger as $$
begin
  insert into incident_events (service_slug, incident_id, event_type) values (new.service_slug, new.id, 'incident_created');
  return new;
end;
$$ language plpgsql;
comment on function log_incident_created is 'Trigger: logs an incident_created event whenever a new incident row is inserted.';

create trigger incidents_log_event after insert on incidents for each row execute function log_incident_created();

-- Trigger function: same idea, for brand-new updates within an incident.
create or replace function log_incident_update_added() returns trigger as $$
begin
  insert into incident_events (service_slug, incident_id, update_id, event_type) values (new.service_slug, new.incident_id, new.id, 'update_added');
  return new;
end;
$$ language plpgsql;
comment on function log_incident_update_added is 'Trigger: logs an update_added event whenever a new incident_updates row is inserted.';

create trigger incident_updates_log_event after insert on incident_updates for each row execute function log_incident_update_added();

-- Seed row — run once. poll_run_lock is a singleton keyed by its fixed id.
insert into poll_run_lock (id, running) values (true, false);
