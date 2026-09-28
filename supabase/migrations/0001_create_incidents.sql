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
alter table incidents enable row level security;

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

create table incident_event_deliveries (
  event_id bigint not null references incident_events (id) on delete cascade,
  integration_slug text not null,
  delivered_at timestamptz not null default now(),
  primary key (event_id, integration_slug)
);
comment on table incident_event_deliveries is 'Per-channel record of which incident_events row has been sent where — the retry/outbox mechanism.';
alter table incident_event_deliveries enable row level security;

create table polled_services (
  service_slug text primary key,
  first_polled_at timestamptz not null default now()
);
comment on table polled_services is 'First-poll marker per service, used to suppress notifying about pre-existing history on a service''s first poll.';
alter table polled_services enable row level security;

create table poll_run_lock (
  id boolean primary key default true,
  running boolean not null default false,
  started_at timestamptz
);
comment on table poll_run_lock is 'Singleton row preventing two poll/notify cycles from running at once; self-heals after 5 minutes if a run crashed without releasing.';
alter table poll_run_lock enable row level security;

create index incidents_updated_at_idx on incidents (updated_at desc);
create index incident_events_occurred_at_idx on incident_events (occurred_at desc);

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

create or replace function log_incident_created() returns trigger as $$
begin
  insert into incident_events (service_slug, incident_id, event_type) values (new.service_slug, new.id, 'incident_created');
  return new;
end;
$$ language plpgsql;
comment on function log_incident_created is 'Trigger: logs an incident_created event whenever a new incident row is inserted.';

create trigger incidents_log_event after insert on incidents for each row execute function log_incident_created();

create or replace function log_incident_update_added() returns trigger as $$
begin
  insert into incident_events (service_slug, incident_id, update_id, event_type) values (new.service_slug, new.incident_id, new.id, 'update_added');
  return new;
end;
$$ language plpgsql;
comment on function log_incident_update_added is 'Trigger: logs an update_added event whenever a new incident_updates row is inserted.';

create trigger incident_updates_log_event after insert on incident_updates for each row execute function log_incident_update_added();

insert into poll_run_lock (id, running) values (true, false);
