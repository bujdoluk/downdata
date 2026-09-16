create table maintenance_reminder_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  service_slug text not null,
  minutes_before integer not null,
  channels text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, service_slug),
  constraint maintenance_reminder_rules_minutes_before_positive check (minutes_before > 0),
  constraint maintenance_reminder_rules_channels_valid check (
    channels <@ array['slack', 'email', 'sms']::text[] and cardinality(channels) > 0
  )
);
comment on table maintenance_reminder_rules is 'One reminder rule per account per scope-target. service_slug = ''__all__'' means "every tracked service"; any other value scopes it to just that service. The plain (user_id, service_slug) unique constraint covers both cases in one ordinary index — see the column comment for why this isn''t a nullable column with partial unique indexes instead.';
comment on column maintenance_reminder_rules.service_slug is '''__all__'' = applies to every tracked service; a specific slug scopes it to just that service. A per-service rule always wins over the account''s ''__all__'' rule for that same service — see resolveRuleForService().';
comment on column maintenance_reminder_rules.minutes_before is 'No hard-coded minimum or maximum — the UI offers presets up to 2 weeks plus a Custom value/unit picker for anything else, but this column itself doesn''t enforce an upper bound. Real delivery precision is bounded by the reminder scan''s own ~1-minute cadence, not this input, see the SPEC.';

create index maintenance_reminder_rules_user_id_idx on maintenance_reminder_rules (user_id);

create or replace function set_maintenance_reminder_rules_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger maintenance_reminder_rules_set_updated_at
  before update on maintenance_reminder_rules
  for each row execute function set_maintenance_reminder_rules_updated_at();

alter table maintenance_reminder_rules enable row level security;

create policy maintenance_reminder_rules_select on maintenance_reminder_rules for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy maintenance_reminder_rules_insert on maintenance_reminder_rules for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy maintenance_reminder_rules_update on maintenance_reminder_rules for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy maintenance_reminder_rules_delete on maintenance_reminder_rules for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create table maintenance_reminder_deliveries (
  rule_id uuid not null references maintenance_reminder_rules(id) on delete cascade,
  service_slug text not null,
  maintenance_id text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz not null default now(),
  sent_early boolean not null default false,
  primary key (rule_id, service_slug, maintenance_id),
  foreign key (service_slug, maintenance_id) references maintenances (service_slug, id) on delete cascade
);
comment on table maintenance_reminder_deliveries is 'Dedup/reschedule tracking for fired reminders. Deliberately no RLS policies (service-role only, cron-scan-owned) — see maintenance_reminder_rules and the SPEC for the full design.';

alter table maintenance_reminder_deliveries enable row level security;
