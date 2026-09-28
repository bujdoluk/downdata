create policy reports_delete on reports for delete
  to authenticated
  using ((select auth.uid()) = user_id);

alter table report_settings add column reported_intervals text[] not null default '{}';

comment on column report_settings.reported_intervals is 'Intervals that have ever had a report generated for this account, independent of whether that report row still exists — see reports_delete above for why this can''t just be derived from counting reports rows.';

insert into report_settings (user_id, reported_intervals)
select user_id, array_agg(distinct report_interval)
from reports
group by user_id
on conflict (user_id) do update set reported_intervals = excluded.reported_intervals;
