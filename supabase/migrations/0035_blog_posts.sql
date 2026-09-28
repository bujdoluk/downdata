create table blog_posts (
  slug text primary key,
  title text not null,
  body_html text not null,
  image_url text,
  logo_slug text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table blog_posts is 'Public blog posts. published_at null = draft; set = live and is the date shown. No RLS policies — service-role client only, gated by ADMIN_EMAIL at the app layer, not Postgres.';

create index blog_posts_published_at_idx on blog_posts (published_at desc) where published_at is not null;

alter table blog_posts enable row level security;

insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

create policy blog_images_select on storage.objects for select
  to public
  using (bucket_id = 'blog-images');
