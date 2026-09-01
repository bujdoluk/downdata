-- Free-text "request a service/integration" submissions from the landing
-- page (anonymous) and the dashboard's add-service/integrations pages
-- (logged in). RLS enabled with zero policies — same pattern as `catalog`
-- and pre-ownership `boards`: nobody reads or writes this table directly
-- from the client, only app/api/requests/route.ts's service-role insert.

create table feature_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('service', 'integration')),
  message text not null,
  -- Null for anonymous landing-page submissions; set from the caller's
  -- session (if any) by the API route, never accepted as client input.
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table feature_requests is 'Free-text service/integration requests. Insert-only via service-role, see app/api/requests/route.ts.';

alter table feature_requests enable row level security;
