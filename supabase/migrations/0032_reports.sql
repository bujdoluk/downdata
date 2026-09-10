-- Weekly/daily/monthly account reports. Two tables, same split as
-- integrations/subscriptions: a settings table the client owns (RLS
-- select/insert/update), and a generated-rows table the client can only
-- read (RLS select-only, same as subscriptions — see 0022's comment) since
-- every row is written by the report-generation cron via the service-role
-- client, never in direct response to a client request.

-- No row for an account = every default still applies (weekly, every
-- board included, nudge email on) — the same "absence = default"
-- convention integrations/subscriptions already use, rather than a row
-- this app has to pre-seed for every signup.
create table report_settings (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  -- Named report_interval, not the bare "interval" (a Postgres built-in
  -- type name) — same avoid-the-generic-name precedent as subscriptions'
  -- own billing_interval column (0022_create_subscriptions.sql).
  report_interval text not null default 'weekly' check (report_interval in ('daily', 'weekly', 'monthly')),
  -- An exclusion list, not an inclusion one — same reasoning as
  -- integrations.excluded_service_slugs (0018): null/empty means "every
  -- one of my boards, including any created later." An inclusion list
  -- can't express that without freezing the current board set.
  excluded_board_ids uuid[],
  email_nudge_enabled boolean not null default true,
  -- Denormalized copy of the account's own profile timezone
  -- (auth.users.user_metadata.time_zone — lib/account.ts), refreshed from
  -- the caller's own session every time this row is read or written (see
  -- features/reports/services/reportSettings.ts's syncOwnTimeZone). The
  -- report-generation cron runs with no session at all and has no other
  -- way to read a per-account IANA timezone without the Admin API, so this
  -- is the one place it's cached for that cross-account read.
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

-- The persisted, generated reports themselves. period_start/period_end are
-- plain dates (calendar-aligned periods — no time-of-day component to the
-- boundary itself, only the send time has one, and that lives in
-- report_settings.time_zone instead). payload is the full computed report
-- (uptime/incidents/at-risk services/board breakdown) — small JSON, kept
-- forever (no retention cap; see AGENTS.md's Data layer note on
-- plan-tier history quotas, which bound how far back a *new* report's
-- source data can reach, not how long an already-generated report stays).
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

-- Deliberately no insert/update/delete policy for `authenticated` — every
-- write happens server-side via the service-role client (the
-- generate-reports cron), never in response to a raw client request.
