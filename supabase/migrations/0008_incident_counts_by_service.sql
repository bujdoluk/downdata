-- Powers the history page's per-service overview chart. A plain aggregate
-- query, not a per-row select mapped/counted in JS — incidents.service_slug
-- is the leading column of the table's own primary key, so this is a cheap
-- index-covered group-by, and it sidesteps the 1000-row PostgREST cap that
-- getStoredIncident.ts already has to work around for row-per-incident reads.
-- Deliberately not `security definer`: incidents has RLS enabled with no
-- policies (see 0001_create_incidents.sql), and running as invoker means
-- anon/authenticated calling this directly still get nothing, same as a
-- direct query against the table would give them.
create or replace function incident_counts_by_service()
returns table(service_slug text, count int) as $$
  select service_slug, count(*)::int
  from incidents
  group by service_slug;
$$ language sql stable;
comment on function incident_counts_by_service is 'Total incident count per service, for the history page overview chart.';
