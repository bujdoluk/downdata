-- Reverses 0032_reports.sql's "deliberately no insert/update/delete policy
-- for authenticated" call on `reports` — a user asked to be able to clean
-- up their own report history, and there's no reason a generated report
-- can't be deleted by the account it belongs to (unlike `subscriptions`,
-- nothing else in this app treats a report row as authoritative state
-- that must stay server-controlled). Mirrors boards_delete/integrations_delete
-- exactly: a real `delete` policy, not a soft-delete flag, so every table
-- in this app that supports deletion does it the same way.
create policy reports_delete on reports for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- generateDueReports decides "is this the very first report ever
-- generated for this account+interval" (which bypasses the normal
-- boundary-day/send-hour schedule and sends immediately) by counting
-- existing `reports` rows — reports_delete above breaks that the moment
-- an account deletes every report for an interval: the count silently
-- drops back to zero and the next cron tick re-fires the "first report"
-- path out of schedule. Tracked independently here instead, so deleting
-- report history can never resurrect that path.
alter table report_settings add column reported_intervals text[] not null default '{}';

comment on column report_settings.reported_intervals is 'Intervals that have ever had a report generated for this account, independent of whether that report row still exists — see reports_delete above for why this can''t just be derived from counting reports rows.';

-- Backfilled once from today's real history so this reads as unchanged
-- behavior for every account that already has reports, not as "every
-- existing account looks like it has never had a first report" the
-- moment this migration runs.
insert into report_settings (user_id, reported_intervals)
select user_id, array_agg(distinct report_interval)
from reports
group by user_id
on conflict (user_id) do update set reported_intervals = excluded.reported_intervals;
