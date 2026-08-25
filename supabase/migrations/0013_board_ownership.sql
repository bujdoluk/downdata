-- Boards become per-account: each signed-in user gets their own boards,
-- enforced at the database level (RLS), not just filtered in app code —
-- a forgotten .eq("user_id", ...) in application code would otherwise
-- leak every user's boards to every other user.

alter table boards add column user_id uuid references auth.users(id) on delete cascade;

-- The pre-accounts seed row ('Your first board', inserted by 0002) has no
-- owner and becomes permanently unreachable once RLS lands below — delete
-- it rather than leave dead data behind.
delete from boards where user_id is null;

alter table boards alter column user_id set default auth.uid();
alter table boards alter column user_id set not null;
create index boards_user_id_idx on boards (user_id);

-- RLS was already enabled (with zero policies) in 0002 — this app only
-- ever connected with the service_role key, which bypasses RLS entirely,
-- so until now "enabled with no policies" just meant zero access for
-- anon/authenticated instead of the full access an RLS-disabled table
-- would grant. lib/boards.ts now runs through the session-bound client
-- (lib/supabase/server.ts) instead of the service-role one, so these
-- policies are what actually scope reads/writes to the current user.
-- (select auth.uid()), not bare auth.uid() — evaluated once per
-- statement instead of once per row.
create policy boards_select on boards for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy boards_insert on boards for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy boards_update on boards for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy boards_delete on boards for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Auto-create each new account's first board. security definer is
-- required here (the trigger fires during the auth.users insert itself,
-- before any session/JWT exists to satisfy the RLS policies above) but
-- is safe: it takes no caller-supplied input, only ever inserting a
-- board for new.id, the user row that was just created by this same
-- insert. Direct calls from client roles are blocked below regardless.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.boards (name, user_id) values ('My board', new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
