alter table polled_services add column total_downtime_seconds bigint not null default 0;
comment on column polled_services.total_downtime_seconds is 'Cumulative seconds this service has spent in an incident since first_polled_at, maintained by update_service_downtime() — excludes the pre-existing backlog from the service''s very first poll.';

create or replace function update_service_downtime() returns trigger as $$
declare
  v_tracked_since timestamptz;
  v_old_seconds numeric;
  v_new_seconds numeric;
begin
  select first_polled_at into v_tracked_since from polled_services where service_slug = new.service_slug;

  if v_tracked_since is null then
    return new;
  end if;

  v_old_seconds := case
    when tg_op = 'UPDATE' and old.impact in ('major', 'critical') and old.resolved_at is not null and old.resolved_at > greatest(old.created_at, v_tracked_since)
    then extract(epoch from (old.resolved_at - greatest(old.created_at, v_tracked_since)))
    else 0
  end;
  v_new_seconds := case
    when new.impact in ('major', 'critical') and new.resolved_at is not null and new.resolved_at > greatest(new.created_at, v_tracked_since)
    then extract(epoch from (new.resolved_at - greatest(new.created_at, v_tracked_since)))
    else 0
  end;

  if v_new_seconds is distinct from v_old_seconds then
    update polled_services
      set total_downtime_seconds = total_downtime_seconds + (v_new_seconds - v_old_seconds)::bigint
      where service_slug = new.service_slug;
  end if;

  return new;
end;
$$ language plpgsql;
comment on function update_service_downtime is 'Keeps polled_services.total_downtime_seconds in sync with resolved major/critical incident durations, clipped to first_polled_at — see the function body for the overlapping-incidents and impact-over-time caveats.';

create trigger incidents_update_downtime after insert or update on incidents for each row execute function update_service_downtime();

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
comment on function get_uptime_stats is 'Tracked-since date, cumulative resolved major/critical downtime, and the live elapsed seconds since the earliest currently-open major/critical incident for one service — powers the monitor detail page''s all-time uptime figure. Empty result if the service has no polled_services row yet.';

with backfill as (
  select
    i.service_slug,
    sum(extract(epoch from (i.resolved_at - greatest(i.created_at, ps.first_polled_at))))::bigint as seconds
  from incidents i
  join polled_services ps on ps.service_slug = i.service_slug
  where i.impact in ('major', 'critical')
    and i.resolved_at is not null
    and i.resolved_at > ps.first_polled_at
  group by i.service_slug
)
update polled_services ps
set total_downtime_seconds = ps.total_downtime_seconds + backfill.seconds
from backfill
where ps.service_slug = backfill.service_slug;
