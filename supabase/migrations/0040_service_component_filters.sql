create table service_component_filters (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  service_slug text not null,
  component_id text not null,
  primary key (user_id, service_slug, component_id)
);
comment on table service_component_filters is 'Per-account, per-service component allowlist ("Custom" mode, shared across every connected integration) — presence of any row for (user_id, service_slug) restricts that service to only those components; no rows = "All components", notify on any component update.';
alter table service_component_filters enable row level security;

create policy service_component_filters_select on service_component_filters for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy service_component_filters_insert on service_component_filters for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy service_component_filters_delete on service_component_filters for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index service_component_filters_lookup_idx on service_component_filters (user_id, service_slug);

create or replace function set_component_filter(p_service_slug text, p_component_ids text[])
returns void as $$
  delete from service_component_filters
    where user_id = auth.uid() and service_slug = p_service_slug;
  insert into service_component_filters (user_id, service_slug, component_id)
    select auth.uid(), p_service_slug, unnest(p_component_ids);
$$ language sql security invoker;
comment on function set_component_filter is 'Atomically replaces the caller''s own component allowlist for one service — delete + reinsert as a single statement so a concurrent read never observes a false "All components" window.';
