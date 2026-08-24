-- Thin bulk dispatchers around the existing single-row upsert_* functions.
-- The poller used to call those once per row over HTTP — fine for a small
-- catalog, but 647 incidents + 2518 updates re-sent every 60s cycle (even
-- when nothing changed, thanks to the diff guard already inside each
-- single-row function) meant thousands of round-trips per cycle, which
-- started exceeding the poll route's 60s budget. These collapse that to
-- one call per service per data type: same per-row diff-guard, same
-- per-row isolation (one bad row can't take its siblings down — each
-- iteration gets its own implicit savepoint via the exception block), just
-- looped inside Postgres instead of over the network.

create or replace function upsert_incidents_bulk(p_service_slug text, p_incidents jsonb)
returns integer as $$
declare
  x record;
  failed_count integer := 0;
begin
  for x in select * from jsonb_to_recordset(p_incidents) as t(
    id text, name text, status text, impact text,
    created_at timestamptz, updated_at timestamptz, monitoring_at timestamptz,
    resolved_at timestamptz, shortlink text, components jsonb
  )
  loop
    begin
      perform upsert_incident(p_service_slug, x.id, x.name, x.status, x.impact, x.created_at, x.updated_at, x.monitoring_at, x.resolved_at, x.shortlink, x.components);
    exception when others then
      failed_count := failed_count + 1;
    end;
  end loop;
  return failed_count;
end;
$$ language plpgsql;
comment on function upsert_incidents_bulk is 'Bulk-dispatches upsert_incident over a jsonb array, one call instead of one per row; returns how many rows failed.';

create or replace function upsert_incident_updates_bulk(p_service_slug text, p_updates jsonb)
returns integer as $$
declare
  x record;
  failed_count integer := 0;
begin
  for x in select * from jsonb_to_recordset(p_updates) as t(
    incident_id text, id text, status text, body text, affected_components jsonb,
    created_at timestamptz, updated_at timestamptz, display_at timestamptz,
    deliver_notifications boolean, custom_tweet text, tweet_id text
  )
  loop
    begin
      perform upsert_incident_update(p_service_slug, x.incident_id, x.id, x.status, x.body, x.affected_components, x.created_at, x.updated_at, x.display_at, x.deliver_notifications, x.custom_tweet, x.tweet_id);
    exception when others then
      failed_count := failed_count + 1;
    end;
  end loop;
  return failed_count;
end;
$$ language plpgsql;
comment on function upsert_incident_updates_bulk is 'Bulk-dispatches upsert_incident_update over a jsonb array, one call instead of one per row; returns how many rows failed.';

create or replace function upsert_maintenances_bulk(p_service_slug text, p_maintenances jsonb)
returns integer as $$
declare
  x record;
  failed_count integer := 0;
begin
  for x in select * from jsonb_to_recordset(p_maintenances) as t(
    id text, name text, status text, impact text,
    created_at timestamptz, updated_at timestamptz, monitoring_at timestamptz,
    resolved_at timestamptz, scheduled_for timestamptz, scheduled_until timestamptz,
    shortlink text, components jsonb
  )
  loop
    begin
      perform upsert_maintenance(p_service_slug, x.id, x.name, x.status, x.impact, x.created_at, x.updated_at, x.monitoring_at, x.resolved_at, x.scheduled_for, x.scheduled_until, x.shortlink, x.components);
    exception when others then
      failed_count := failed_count + 1;
    end;
  end loop;
  return failed_count;
end;
$$ language plpgsql;
comment on function upsert_maintenances_bulk is 'Bulk-dispatches upsert_maintenance over a jsonb array, one call instead of one per row; returns how many rows failed.';

create or replace function upsert_maintenance_updates_bulk(p_service_slug text, p_updates jsonb)
returns integer as $$
declare
  x record;
  failed_count integer := 0;
begin
  for x in select * from jsonb_to_recordset(p_updates) as t(
    maintenance_id text, id text, status text, body text, affected_components jsonb,
    created_at timestamptz, updated_at timestamptz, display_at timestamptz,
    deliver_notifications boolean, custom_tweet text, tweet_id text
  )
  loop
    begin
      perform upsert_maintenance_update(p_service_slug, x.maintenance_id, x.id, x.status, x.body, x.affected_components, x.created_at, x.updated_at, x.display_at, x.deliver_notifications, x.custom_tweet, x.tweet_id);
    exception when others then
      failed_count := failed_count + 1;
    end;
  end loop;
  return failed_count;
end;
$$ language plpgsql;
comment on function upsert_maintenance_updates_bulk is 'Bulk-dispatches upsert_maintenance_update over a jsonb array, one call instead of one per row; returns how many rows failed.';
