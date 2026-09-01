-- Stripe-backed subscriptions, one row per account. Unlike boards/
-- integrations, the client never writes this table directly — every write
-- (initial checkout, cancel/resume, webhook sync) goes through server code
-- using the service-role client. A client-writable plan/status would let
-- any signed-in user grant themselves "pro" via a raw REST call, so RLS
-- here gets exactly one policy: select. No row for a user means "free
-- tier", the same convention integrations already uses for "not connected".

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade default auth.uid(),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null check (plan in ('starter', 'pro', 'business')),
  -- Stripe's own billing-interval vocabulary (Price.recurring.interval),
  -- not reusing "monthly"/"annual" from the marketing copy so this column
  -- can be compared directly against webhook payloads without translating.
  billing_interval text not null check (billing_interval in ('month', 'year')),
  -- Stripe Subscription.status values (incomplete, trialing, active,
  -- past_due, canceled, unpaid, paused, ...) — deliberately no check
  -- constraint, so a new status Stripe introduces never breaks a webhook
  -- write.
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

-- Deliberately no insert/update/delete policy for `authenticated` — every
-- write happens server-side via the service-role client (checkout
-- fulfillment, cancel/resume, webhook sync), never in response to a raw
-- client request.
