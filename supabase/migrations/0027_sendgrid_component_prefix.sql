-- SendGrid's status page (status.sendgrid.com) now fully redirects into
-- Twilio's combined status page (status.twilio.com) — one shared project
-- covering Twilio's entire product line (Voice, SMS, Video, Flex, Carrier
-- Network, ...) plus SendGrid's own ~10 components. That page's
-- /api/v2/incidents.json has no per-product filter, so every poll cycle
-- since the merge has been storing *every* Twilio incident/maintenance
-- under service_slug = 'sendgrid', not just the ones actually affecting a
-- SendGrid component. See src/lib/componentNamePrefix.ts for the runtime
-- fix (poller + live summary route) — this migration adds the column that
-- drives it and cleans up what's already been wrongly stored.

alter table catalog add column component_name_prefix text;
comment on column catalog.component_name_prefix is 'Set only when this host''s status page covers more than one product (e.g. SendGrid on Twilio''s shared page) — components/incidents/maintenances are kept only if at least one affected component''s name starts with this, case-insensitively. Null means "use everything," the default for every other service.';

update catalog set component_name_prefix = 'SendGrid' where slug = 'sendgrid';

-- Delete every incident/maintenance currently stored under 'sendgrid'
-- whose components don't include a single SendGrid-branded one — these
-- are unrelated Twilio incidents that were never SendGrid's to begin
-- with. Cascades (incident_updates/incident_events/incident_event_deliveries,
-- maintenance_updates) clean up automatically via their existing foreign
-- keys — see 0001_create_incidents.sql/0005_create_maintenances.sql.
delete from incidents
where service_slug = 'sendgrid'
  and not exists (
    select 1 from jsonb_array_elements(coalesce(incidents.components, '[]'::jsonb)) as c
    where c ->> 'name' ilike 'SendGrid%'
  );

delete from maintenances
where service_slug = 'sendgrid'
  and not exists (
    select 1 from jsonb_array_elements(coalesce(maintenances.components, '[]'::jsonb)) as c
    where c ->> 'name' ilike 'SendGrid%'
  );

-- polled_services.total_downtime_seconds is maintained incrementally by a
-- trigger on `incidents` (see 0024_service_uptime_stats.sql) — it only
-- ever adds on insert/update, never subtracts on delete. The bulk delete
-- above leaves it holding downtime from incidents that no longer exist, so
-- it has to be recomputed from scratch for 'sendgrid' using the exact same
-- formula 0024's own one-time backfill used, now scoped to only the
-- incidents that survived the cleanup above.
update polled_services ps
set total_downtime_seconds = coalesce((
  select sum(extract(epoch from (i.resolved_at - greatest(i.created_at, ps.first_polled_at))))::bigint
  from incidents i
  where i.service_slug = ps.service_slug
    and i.impact in ('major', 'critical')
    and i.resolved_at is not null
    and i.resolved_at > ps.first_polled_at
), 0)
where ps.service_slug = 'sendgrid';
