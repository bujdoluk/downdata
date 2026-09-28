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

create table boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service_slugs text[] not null default '{}'
);
comment on table boards is 'User-created boards grouping tracked services by slug — service_slugs is a plain array, not a join table, since board membership is small.';
alter table boards enable row level security;

insert into boards (name) values ('Your first board');

create table integrations (
  slug text primary key,
  name text not null,
  webhook_url text not null
);
comment on table integrations is 'Connected notification integrations (Slack today) — one row per slug, upserted on (re)connect.';
alter table integrations enable row level security;
