create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade default auth.uid(),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null check (plan in ('starter', 'pro', 'business')),
  billing_interval text not null check (billing_interval in ('month', 'year')),
  status text not null default 'active',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table subscriptions is 'One Stripe subscription per account. Select-only RLS — see lib/subscriptions.ts for the service-role write paths.';

alter table subscriptions enable row level security;

create policy subscriptions_select on subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);
