create table report_settings (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  report_interval text not null default 'weekly' check (report_interval in ('daily', 'weekly', 'monthly')),
  excluded_board_ids uuid[],
  email_nudge_enabled boolean not null default true,
  time_zone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table report_settings is 'One row per account, created lazily on first settings read/save. Absence = every default (weekly, all boards, nudge on, UTC).';

alter table report_settings enable row level security;

create policy report_settings_select on report_settings for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy report_settings_insert on report_settings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy report_settings_update on report_settings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_interval text not null check (report_interval in ('daily', 'weekly', 'monthly')),
  period_start date not null,
  period_end date not null,
  generated_at timestamptz not null default now(),
  payload jsonb not null,
  unique (user_id, report_interval, period_start)
);

comment on table reports is 'Generated report rows, one per account+interval+period. Select-only RLS — see features/reports/services/reportGeneration.ts for the service-role write path.';

create index reports_user_id_idx on reports (user_id, period_start desc);

alter table reports enable row level security;

create policy reports_select on reports for select
  to authenticated
  using ((select auth.uid()) = user_id);
