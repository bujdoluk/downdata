-- Moves the app's core persistence (tracked services, boards,
-- integrations) off flat JSON files onto Supabase — those files lived at
-- data/*.json under process.cwd(), which works fine under `next dev`/
-- `next start` on a normal machine but breaks entirely on Vercel: its
-- deployed functions run against a read-only filesystem, so the first
-- request to almost any page threw ENOENT trying to mkdir/write there.
-- Run this once, same as 0001.

-- The user's tracked services — the "My Services" list. Seeded with the
-- same GitHub/Supabase built-ins lib/services.ts used to seed on first
-- run of the old data/services.json file.
create table services (
  slug text primary key,
  name text not null,
  host text not null
);
comment on table services is 'User''s tracked services (the "My Services" list) — slug/name/host, resolved against lib/serviceCatalog.ts for anything not yet tracked.';
alter table services enable row level security;

insert into services (slug, name, host) values
  ('github', 'GitHub', 'www.githubstatus.com'),
  ('supabase', 'Supabase', 'status.supabase.com')
on conflict (slug) do nothing;

-- User-created boards grouping tracked services by slug reference. A
-- plain text[] column matches the app's existing Board.serviceSlugs
-- shape directly — boards are small (a handful of services each), so a
-- normalized join table would be more machinery than this needs.
create table boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service_slugs text[] not null default '{}'
);
comment on table boards is 'User-created boards grouping tracked services by slug — service_slugs is a plain array, not a join table, since board membership is small.';
alter table boards enable row level security;

-- Same "already have one to start with" seed as the old first-run file,
-- so a fresh deployment isn't a blank Boards page either.
insert into boards (name) values ('Your first board');

-- Connected notification integrations — currently just Slack, added via
-- its OAuth "Add to Slack" flow (see app/api/integrations/slack/callback).
create table integrations (
  slug text primary key,
  name text not null,
  webhook_url text not null
);
comment on table integrations is 'Connected notification integrations (Slack today) — one row per slug, upserted on (re)connect.';
alter table integrations enable row level security;
