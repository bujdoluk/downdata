-- The full universe of known Statuspage-based hosts, polled continuously
-- regardless of whether any user tracks them — this is what makes the
-- incident-history dataset independent of personal tracking. `services`
-- (the tracked subset) is expected to always be a subset of this table.
-- Run this once, same as 0001/0002.
create table catalog (
  slug text primary key,
  name text not null,
  host text not null unique,
  category text not null default 'other'
);
comment on table catalog is 'Full universe of known Statuspage hosts polled for incident history, independent of what any user tracks.';

alter table catalog enable row level security;

-- Seed with today's hardcoded SERVICE_CATALOG (lib/serviceCatalog.ts) so
-- nothing already visible in the add-service picker disappears.
insert into catalog (slug, name, host, category) values
  ('github', 'GitHub', 'www.githubstatus.com', 'devtools'),
  ('supabase', 'Supabase', 'status.supabase.com', 'database'),
  ('cloudflare', 'Cloudflare', 'www.cloudflarestatus.com', 'infrastructure'),
  ('vercel', 'Vercel', 'www.vercel-status.com', 'infrastructure'),
  ('discord', 'Discord', 'discordstatus.com', 'communication'),
  ('npm', 'npm', 'status.npmjs.org', 'devtools'),
  ('digitalocean', 'DigitalOcean', 'status.digitalocean.com', 'infrastructure'),
  ('netlify', 'Netlify', 'www.netlifystatus.com', 'infrastructure'),
  ('openai', 'OpenAI', 'status.openai.com', 'ai'),
  ('zoom', 'Zoom', 'www.zoomstatus.com', 'communication'),
  ('dropbox', 'Dropbox', 'status.dropbox.com', 'communication'),
  ('atlassian', 'Atlassian', 'status.atlassian.com', 'devtools'),
  ('twilio', 'Twilio', 'status.twilio.com', 'communication'),
  ('mongodb', 'MongoDB', 'status.mongodb.com', 'database'),
  ('datadog', 'Datadog', 'status.datadoghq.com', 'devtools'),
  ('circleci', 'CircleCI', 'status.circleci.com', 'devtools')
on conflict (slug) do nothing;
