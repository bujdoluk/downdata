-- Per-account, per-service component allowlist ("Custom" mode — see
-- docs/specs/SPEC-component-notification-filters.md). One shared filter
-- per (user, service) — not per integration; every connected integration
-- that would otherwise notify for this service respects it uniformly.
-- Presence of any row for (user_id, service_slug) restricts that service
-- to only those components; zero rows means "All components" (today's
-- default, notify on any component update). Never saved with zero rows
-- while in Custom mode (enforced at the app layer, not here) — that's
-- what keeps "zero rows" unambiguous as "All components" rather than
-- needing a separate mode column.
create table service_component_filters (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  service_slug text not null,
  component_id text not null,
  primary key (user_id, service_slug, component_id)
);
comment on table service_component_filters is 'Per-account, per-service component allowlist ("Custom" mode, shared across every connected integration) — presence of any row for (user_id, service_slug) restricts that service to only those components; no rows = "All components", notify on any component update.';
alter table service_component_filters enable row level security;

-- Same direct user_id ownership pattern as boards (0013_board_ownership.sql)
-- — this is genuinely account-owned data, not owned through any parent
-- integration row.
create policy service_component_filters_select on service_component_filters for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy service_component_filters_insert on service_component_filters for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy service_component_filters_delete on service_component_filters for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Queried once per (account, service) pair on every ~60s notification
-- cron cycle, not just from a settings page — same reasoning as 0012/0039's
-- own lookup indexes.
create index service_component_filters_lookup_idx on service_component_filters (user_id, service_slug);

-- Replaces the full component set for the caller's own (user_id,
-- service_slug) pair as a single atomic statement — a plain client-side
-- delete-then-insert would leave a real window where a concurrent read
-- (the notification cron) could see zero rows (i.e. "All components", the
-- opposite of what's being saved) between the two calls. Uses auth.uid()
-- internally rather than accepting it as a parameter, so there's no
-- argument shape that could ever target another account's row — RLS would
-- reject a mismatched value anyway, but this removes the question
-- entirely. security invoker (the default) is correct: this always runs
-- through the session-scoped client, so RLS still applies to the caller's
-- own row, same as every other write path in this app.
create or replace function set_component_filter(p_service_slug text, p_component_ids text[])
returns void as $$
  delete from service_component_filters
    where user_id = auth.uid() and service_slug = p_service_slug;
  insert into service_component_filters (user_id, service_slug, component_id)
    select auth.uid(), p_service_slug, unnest(p_component_ids);
$$ language sql security invoker;
comment on function set_component_filter is 'Atomically replaces the caller''s own component allowlist for one service — delete + reinsert as a single statement so a concurrent read never observes a false "All components" window.';
