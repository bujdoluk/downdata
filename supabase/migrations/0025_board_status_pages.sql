-- Public, unauthenticated status pages — one per board, opt-in. Unlike
-- boards/integrations (owner-only RLS), this table needs a *public* read
-- path too: anyone with the link, no session, reads the one row that has
-- enabled = true for their slug. Same shape 0014_avatar_storage.sql
-- already established for the avatars bucket — writes locked to the
-- owner, reads open by design for the parts meant to be public.
create table board_status_pages (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null unique references boards(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug text not null unique,
  enabled boolean not null default false,
  company_name text,
  logo_url text,
  -- Only meaningful when logo_url is null: hides downDATA's own default
  -- mark instead of showing it. Sits alongside logo_url rather than a
  -- separate "branding mode" enum since the header is one logo slot with
  -- three outcomes (custom logo / downDATA default / hidden), and which
  -- one wins is fully determined by these two columns.
  hide_branding boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table board_status_pages is 'Public status page settings, one per board (opt-in via enabled). No per-service visibility list — every service on the board shows; only branding is configurable.';
comment on column board_status_pages.slug is 'The public URL segment (/status/:slug) — auto-suggested from the board/company name, user-editable, must stay unique across all accounts.';
comment on column board_status_pages.logo_url is 'Custom company logo shown in the public page header; null falls back to downDATA''s own mark unless hide_branding is set.';

create index board_status_pages_user_id_idx on board_status_pages (user_id);

-- A plain trigger, not application code, so updated_at can't be forgotten
-- on some future write path that isn't lib/statusPages.ts.
create or replace function set_board_status_pages_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger board_status_pages_set_updated_at
  before update on board_status_pages
  for each row execute function set_board_status_pages_updated_at();

alter table board_status_pages enable row level security;

-- Owner CRUD — same four-policy shape as 0013_board_ownership.sql/
-- 0018_integration_ownership.sql.
create policy board_status_pages_select on board_status_pages for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy board_status_pages_insert on board_status_pages for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy board_status_pages_update on board_status_pages for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy board_status_pages_delete on board_status_pages for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- No anon/public select policy here, deliberately: the public read path
-- (GET /api/public/status/[slug]) is server-side Next.js code, not a
-- browser-side Supabase call, so it follows the same rule AGENTS.md
-- already documents for boards.ts's getAllTrackedSlugsAcrossUsers() — one
-- narrowly-scoped service-role function (lib/statusPages.ts's
-- getPublicStatusPageBySlug) for exactly that one caller, which also
-- needs to read boards.name/service_slugs (no ownership RLS would let an
-- anon policy join across anyway) rather than widening this table's RLS.

-- Logo storage — same public-bucket shape as 0014_avatar_storage.sql, but
-- the folder segment is a board id, not the caller's own id, so the write
-- policies need an ownership subquery instead of a flat auth.uid() match.
insert into storage.buckets (id, name, public)
values ('status-page-logos', 'status-page-logos', true)
on conflict (id) do nothing;

create policy status_page_logos_select on storage.objects for select
  to public
  using (bucket_id = 'status-page-logos');

create policy status_page_logos_insert on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'status-page-logos'
    and exists (
      select 1 from boards
      where id = (storage.foldername(name))[1]::uuid
        and user_id = (select auth.uid())
    )
  );

create policy status_page_logos_update on storage.objects for update
  to authenticated
  using (
    bucket_id = 'status-page-logos'
    and exists (
      select 1 from boards
      where id = (storage.foldername(name))[1]::uuid
        and user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'status-page-logos'
    and exists (
      select 1 from boards
      where id = (storage.foldername(name))[1]::uuid
        and user_id = (select auth.uid())
    )
  );

create policy status_page_logos_delete on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'status-page-logos'
    and exists (
      select 1 from boards
      where id = (storage.foldername(name))[1]::uuid
        and user_id = (select auth.uid())
    )
  );
