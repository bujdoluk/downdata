-- Integrations (Slack/Email/SMS) become per-account, the same treatment
-- `0013_board_ownership.sql` already gave boards: each signed-in user
-- gets their own connections, enforced at the database level (RLS), not
-- just filtered in app code. lib/integrations.ts moves from the
-- service-role client to the session-scoped one (lib/supabase/server.ts),
-- same as lib/boards.ts.
--
-- `slug` can no longer be the primary key — two different accounts each
-- connecting their own Slack need two separate rows with slug = 'slack'.
alter table integrations add column id uuid not null default gen_random_uuid();
alter table integrations add column user_id uuid references auth.users(id) on delete cascade;
-- An exclusion list, not an inclusion list: null/empty means "notify
-- about everything this account tracks, including anything tracked
-- later." An inclusion list can't express that — turning one service's
-- notifications off while otherwise unrestricted would have to freeze
-- the *entire current tracked set minus that one* into an explicit list,
-- silently converting "everything, forever" into "this fixed snapshot"
-- and excluding every service tracked afterward with no visible signal
-- why. Excluding one service is always just an append here; it never
-- needs to know what else is currently tracked.
alter table integrations add column excluded_service_slugs text[];
comment on column integrations.excluded_service_slugs is 'Which of this account''s own tracked services should NOT trigger this integration; null/empty = notify about all of them, including any tracked later.';

-- Existing rows are your own dev/testing connections, not a shared
-- workspace to fan out — assigned to your one account (same account
-- `0017` folds `services` into), not duplicated. Because this is a
-- straight reassignment rather than a fan-out, incident_event_deliveries
-- below has exactly one unambiguous target integration_id per old slug,
-- not several to guess between.
update integrations set user_id = (select id from auth.users where email = 'lukas.bujdos@gmail.com');
delete from integrations where user_id is null;

alter table integrations alter column user_id set default auth.uid();
alter table integrations alter column user_id set not null;
create index integrations_user_id_idx on integrations (user_id);

alter table integrations drop constraint integrations_pkey;
alter table integrations add primary key (id);
alter table integrations add constraint integrations_user_id_slug_key unique (user_id, slug);

create policy integrations_select on integrations for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy integrations_insert on integrations for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy integrations_update on integrations for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy integrations_delete on integrations for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Delivery-tracking (what's already been sent, so nothing double-sends)
-- was keyed by integration_slug — fine while slug was globally unique,
-- actively wrong once it isn't: two different accounts' Slack
-- integrations would otherwise share one delivery-tracking row, so
-- account A's successful send would falsely mark account B's identical
-- integration as "already delivered," silently swallowing B's
-- notification forever. Re-key on the integration's own id instead.
alter table incident_event_deliveries add column integration_id uuid references integrations(id) on delete cascade;

update incident_event_deliveries d
set integration_id = i.id
from integrations i
where i.slug = d.integration_slug;

-- Any delivery row that couldn't be matched (an integration slug that no
-- longer exists) is now orphaned history with nothing to key it to —
-- drop it rather than leave a null-integration_id row primary-key
-- constraints below would reject anyway.
delete from incident_event_deliveries where integration_id is null;

alter table incident_event_deliveries drop constraint incident_event_deliveries_pkey;
alter table incident_event_deliveries alter column integration_id set not null;
alter table incident_event_deliveries add primary key (event_id, integration_id);
alter table incident_event_deliveries drop column integration_slug;
