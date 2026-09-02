-- Cumulative "official" uptime per service, tracked since polled_services'
-- existing first_polled_at (the moment this catalog service was first
-- successfully polled — see lib/pollIncidents.ts's backfillIfFirstPoll).
-- Maintained incrementally by a trigger on `incidents` rather than
-- recomputed by aggregating a service's whole incident history on every
-- page view — see the Failure log's note on what re-scanning the full
-- incidents feed every cycle already did to this project's Postgres
-- compute once before.
alter table polled_services add column total_downtime_seconds bigint not null default 0;
comment on column polled_services.total_downtime_seconds is 'Cumulative seconds this service has spent in an incident since first_polled_at, maintained by update_service_downtime() — excludes the pre-existing backlog from the service''s very first poll.';

-- Fires after every insert/update on `incidents` (upsert_incident already
-- no-ops an unchanged row, so this only runs when something actually
-- changed) and keeps polled_services.total_downtime_seconds in sync.
--
-- Only major/critical count as an "official" outage toward uptime — a
-- minor incident is degraded performance, not downtime (see
-- components/service/statusStyles.ts's own "Minor Issues" vs "Outage"
-- labeling, and lib/uptime.ts's matching OUTAGE_IMPACTS filter for the
-- 30-day figure computed in JS — keep both in sync if this ever changes).
--
-- Known simplification: each incident's downtime is summed independently.
-- Two genuinely overlapping incidents on the same service double-count
-- their shared window (all-time uptime reads slightly low in that edge
-- case) — fixing that exactly would mean re-scanning and interval-merging
-- the service's whole incident history on every row change, the same
-- per-poll-cycle cost this trigger exists to avoid. Similarly, only an
-- incident's current/latest impact is stored (not impact-over-time), so
-- an incident that started `minor` and was later escalated to `major` is
-- credited to `major` for its whole duration, not time-sliced.
create or replace function update_service_downtime() returns trigger as $$
declare
  v_tracked_since timestamptz;
  v_old_seconds numeric;
  v_new_seconds numeric;
begin
  select first_polled_at into v_tracked_since from polled_services where service_slug = new.service_slug;

  -- No polled_services row yet: this row is part of the very first poll's
  -- historical backlog for a brand-new service (that poll runs before
  -- backfillIfFirstPoll inserts the row) — deliberately excluded from this
  -- service's own uptime record, mirroring how the same backlog is already
  -- excluded from notifications.
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

-- Read path for the monitor detail page's all-time uptime figure: one
-- indexed row lookup on polled_services plus this service's currently-open
-- incidents (almost always zero rows), not an aggregate over its whole
-- history. Same style as incident_counts_by_service() (0008) — plain
-- invoker-rights SQL, since incidents/polled_services have RLS enabled
-- with no policies and this app only ever connects service-role anyway.
create or replace function get_uptime_stats(p_service_slug text)
returns table(tracked_since timestamptz, total_downtime_seconds bigint, open_incident_seconds bigint) as $$
  select
    ps.first_polled_at,
    ps.total_downtime_seconds,
    coalesce(sum(extract(epoch from (now() - greatest(i.created_at, ps.first_polled_at))))::bigint, 0)
  from polled_services ps
  left join incidents i on i.service_slug = ps.service_slug and i.resolved_at is null and i.impact in ('major', 'critical')
  where ps.service_slug = p_service_slug
  group by ps.first_polled_at, ps.total_downtime_seconds;
$$ language sql stable;
comment on function get_uptime_stats is 'Tracked-since date, cumulative resolved major/critical downtime, and any currently-open major/critical incident''s live elapsed seconds for one service — powers the monitor detail page''s all-time uptime figure. Empty result if the service has no polled_services row yet.';

-- One-time backfill so existing resolved major/critical incidents count
-- from day one — without this, total_downtime_seconds starts at 0 for
-- every already-tracked service regardless of real history on file, since
-- the trigger above only fires on a *future* insert/update. Runs once,
-- here, at migration-apply time — not a repeating cost.
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
