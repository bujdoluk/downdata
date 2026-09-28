create or replace function incident_counts_by_service()
returns table(service_slug text, count int) as $$
  select service_slug, count(*)::int
  from incidents
  group by service_slug;
$$ language sql stable;
comment on function incident_counts_by_service is 'Total incident count per service, for the history page overview chart.';
