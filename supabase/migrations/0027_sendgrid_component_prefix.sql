alter table catalog add column component_name_prefix text;
comment on column catalog.component_name_prefix is 'Set only when this host''s status page covers more than one product (e.g. SendGrid on Twilio''s shared page) — components/incidents/maintenances are kept only if at least one affected component''s name starts with this, case-insensitively. Null means "use everything," the default for every other service.';

update catalog set component_name_prefix = 'SendGrid' where slug = 'sendgrid';

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
