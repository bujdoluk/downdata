create or replace function get_uptime_stats(p_service_slug text)
returns table(tracked_since timestamptz, total_downtime_seconds bigint, open_incident_seconds bigint) as $$
  select
    ps.first_polled_at,
    ps.total_downtime_seconds,
    case
      when min(i.created_at) is null then 0
      else extract(epoch from (now() - greatest(min(i.created_at), ps.first_polled_at)))::bigint
    end
  from polled_services ps
  left join incidents i on i.service_slug = ps.service_slug and i.resolved_at is null and i.impact in ('major', 'critical')
  where ps.service_slug = p_service_slug
  group by ps.first_polled_at, ps.total_downtime_seconds;
$$ language sql stable;
comment on function get_uptime_stats is 'Tracked-since date, cumulative resolved major/critical downtime, and the live elapsed seconds since the earliest currently-open major/critical incident for one service — powers the monitor detail page''s all-time uptime figure. Empty result if the service has no polled_services row yet. Re-applied by 0029 after 0024''s in-place edit never reached production; see that migration''s header comment.';
