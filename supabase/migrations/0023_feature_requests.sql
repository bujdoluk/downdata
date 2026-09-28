create table feature_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('service', 'integration')),
  message text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table feature_requests is 'Free-text service/integration requests. Insert-only via service-role, see app/api/requests/route.ts.';

alter table feature_requests enable row level security;
