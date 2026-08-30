-- Early Warnings: per-account keyword monitoring, polled against external
-- platforms (Reddit first — see lib/keywordSources/). Deliberately leaner
-- than the incidents schema: a matched post never "updates" the way an
-- incident does, and v1 has no outbound notification fan-out, so none of
-- incidents' upsert-in-place/trigger/outbox machinery applies here.

-- What an account is watching for. Platform-agnostic on purpose — one
-- keyword list per account, checked against whichever sources that account
-- has enabled (keyword_source_settings below), not one list per source.
create table keyword_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  keyword text not null,
  created_at timestamptz not null default now(),
  unique (user_id, keyword)
);
comment on table keyword_watches is 'Per-account keyword watchlist for Early Warnings — platform-agnostic, checked against whichever sources the account has enabled.';
alter table keyword_watches enable row level security;
create index keyword_watches_user_id_idx on keyword_watches (user_id);

create policy keyword_watches_select on keyword_watches for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy keyword_watches_insert on keyword_watches for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- No column here actually changes on a re-added keyword (addKeywordWatch
-- upserts on (user_id, keyword), the same two columns as the conflict
-- target) — but Postgres still requires UPDATE permission to attempt the
-- ON CONFLICT DO UPDATE branch at all, even for a no-op update, so this
-- policy exists purely to let that upsert succeed rather than error.
create policy keyword_watches_update on keyword_watches for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy keyword_watches_delete on keyword_watches for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Per-account, per-source on/off toggle. Defaults to disabled — polling is
-- opt-in, and an account with no enabled row for a source costs that
-- source zero poll requests (see lib/pollKeywordSources.ts's query, which
-- joins against this table rather than assuming every watch is active).
create table keyword_source_settings (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  source text not null,
  enabled boolean not null default false,
  primary key (user_id, source)
);
comment on table keyword_source_settings is 'Per-account, per-source polling toggle for Early Warnings — off by default.';
alter table keyword_source_settings enable row level security;

create policy keyword_source_settings_select on keyword_source_settings for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy keyword_source_settings_insert on keyword_source_settings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy keyword_source_settings_update on keyword_source_settings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Global cache of matches, keyed so the same (source, keyword) pair is
-- only ever polled once regardless of how many accounts watch it — same
-- reasoning as why `catalog` is fetched once and read by everyone, not
-- once per account. Service-role only, like `incidents`/`catalog`: no
-- policies, so RLS here just means authenticated/anon get zero access by
-- default (this app only ever reads it through the service-role client,
-- scoped in application code to the caller's own watched keywords — see
-- lib/earlyWarnings.ts).
create table keyword_matches (
  source text not null,
  keyword text not null,
  external_id text not null,
  kind text not null check (kind in ('post', 'comment')),
  title text not null,
  url text not null,
  author text not null,
  snippet text not null,
  published_at timestamptz not null,
  metadata jsonb,
  captured_at timestamptz not null default now(),
  primary key (source, keyword, external_id)
);
comment on table keyword_matches is 'Global cache of keyword matches (Early Warnings) — one row per unique match regardless of how many accounts watch that keyword. Rows older than 60 days are pruned by the poll cron.';
alter table keyword_matches enable row level security;
create index keyword_matches_captured_at_idx on keyword_matches (captured_at desc);
