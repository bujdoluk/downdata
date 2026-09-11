-- Public blog. No admin/RBAC system exists in this app (see AGENTS.md), so
-- there's no per-row ownership to express in RLS the way boards/
-- integrations do — this table has exactly one writer (the site owner,
-- gated by ADMIN_EMAIL at the application layer, not by Postgres) and is
-- otherwise public reference content, same shape as `catalog`: no
-- policies at all, service-role client for every read and write (see
-- features/blog/services/blogPosts.ts). RLS is still enabled so an
-- anon/authenticated client gets zero direct access by default, matching
-- every other service-role-only table in this app.
create table blog_posts (
  slug text primary key,
  title text not null,
  body_html text not null,
  image_url text,
  -- For a future per-post logo picker (reusing components/logos/'s
  -- SERVICE_LOGOS registry) — deliberately unused for now, the admin form
  -- doesn't expose it yet and every post renders a fallback placeholder
  -- instead. Added now so shipping that picker later doesn't need a schema
  -- migration of its own.
  logo_slug text,
  -- Null = draft, not publicly visible. Set = published, and this is the
  -- date shown on the card/detail page — deliberately not created_at, so
  -- editing a draft for days before publishing never shows a stale date.
  published_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table blog_posts is 'Public blog posts. published_at null = draft; set = live and is the date shown. No RLS policies — service-role client only, gated by ADMIN_EMAIL at the app layer, not Postgres.';

-- Backs the public listing's "published, newest first" query — partial
-- since the vast majority of scans only ever care about published rows.
create index blog_posts_published_at_idx on blog_posts (published_at desc) where published_at is not null;

alter table blog_posts enable row level security;

-- Background images for blog posts. Public bucket (rendered on the public
-- /blog grid and detail pages), but deliberately no insert/update/delete
-- policy for `authenticated` at all — unlike avatars/status-page-logos,
-- there's no per-user auth.uid() ownership to check here (this bucket has
-- exactly one writer: the site admin), so every write goes through the
-- admin-gated API route using the service-role client instead of a direct
-- browser-to-Storage upload. Same "no client write policy, service-role
-- only" shape as the subscriptions/reports tables.
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

create policy blog_images_select on storage.objects for select
  to public
  using (bucket_id = 'blog-images');
