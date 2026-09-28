alter table boards add column user_id uuid references auth.users(id) on delete cascade;

delete from boards where user_id is null;

alter table boards alter column user_id set default auth.uid();
alter table boards alter column user_id set not null;
create index boards_user_id_idx on boards (user_id);

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
