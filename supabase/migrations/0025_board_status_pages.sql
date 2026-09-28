create table board_status_pages (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null unique references boards(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug text not null unique,
  enabled boolean not null default false,
  company_name text,
  logo_url text,
  hide_branding boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table board_status_pages is 'Public status page settings, one per board (opt-in via enabled). No per-service visibility list — every service on the board shows; only branding is configurable.';
comment on column board_status_pages.slug is 'The public URL segment (/status/:slug) — auto-suggested from the board/company name, user-editable, must stay unique across all accounts.';
comment on column board_status_pages.logo_url is 'Custom company logo shown in the public page header; null falls back to downDATA''s own mark unless hide_branding is set.';

create index board_status_pages_user_id_idx on board_status_pages (user_id);

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
