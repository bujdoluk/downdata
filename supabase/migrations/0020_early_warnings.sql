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

create policy keyword_watches_update on keyword_watches for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy keyword_watches_delete on keyword_watches for delete
  to authenticated
  using ((select auth.uid()) = user_id);

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
