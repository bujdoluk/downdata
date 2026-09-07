-- Re-applies get_uptime_stats() as a NEW migration rather than editing
-- 0024_service_uptime_stats.sql again.
--
-- 0024 originally shipped with a bug: open_incident_seconds was computed as
-- coalesce(sum(extract(epoch from (now() - greatest(i.created_at,
-- first_polled_at))))::bigint, 0) over a left join that (correctly) returns
-- zero matching rows when a service has no currently-open major/critical
-- incident. With zero matches the left join still yields one row with
-- i.created_at = null, and Postgres's greatest() silently ignores null and
-- falls back to first_polled_at — so open_incident_seconds computed as the
-- service's *entire* tracked-since window, for every service, all the time,
-- not only while something was actually open. That pushed officialAllTimeUptime
-- (lib/uptime.ts) toward 0% globally.
--
-- The fix (an explicit `case when min(i.created_at) is null then 0 ...`
-- guard) was written by editing 0024's file in place a few hours later, the
-- same day. That never reached production: Supabase's migration runner
-- tracks applied migrations by version/filename, not content, so once 0024
-- was recorded as applied (from the first, buggy push), editing that same
-- file and pushing again left `supabase db push` seeing "0024 already
-- applied" and skipping it — the corrected SQL sat committed on master for
-- days without ever being re-run against the live database. Migrations here
-- are forward-only; a bug in an already-shipped one needs a new migration
-- that re-issues the fixed `create or replace function`, not an edit to the
-- old file (see AGENTS.md's Failure log for the write-up).
--
-- total_downtime_seconds (the resolved-incident half, maintained by the
-- update_service_downtime() trigger) was never affected by this bug and
-- needs no repair — this only corrects how open_incident_seconds is
-- computed at read time, so every service's all-time uptime is correct on
-- the next read once this lands, with nothing to backfill.
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
