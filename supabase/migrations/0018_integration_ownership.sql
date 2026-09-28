alter table integrations add column id uuid not null default gen_random_uuid();
alter table integrations add column user_id uuid references auth.users(id) on delete cascade;
alter table integrations add column excluded_service_slugs text[];
comment on column integrations.excluded_service_slugs is 'Which of this account''s own tracked services should NOT trigger this integration; null/empty = notify about all of them, including any tracked later.';

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

alter table incident_event_deliveries add column integration_id uuid references integrations(id) on delete cascade;

update incident_event_deliveries d
set integration_id = i.id
from integrations i
where i.slug = d.integration_slug;

delete from incident_event_deliveries where integration_id is null;

alter table incident_event_deliveries drop constraint incident_event_deliveries_pkey;
alter table incident_event_deliveries alter column integration_id set not null;
alter table incident_event_deliveries add primary key (event_id, integration_id);
alter table incident_event_deliveries drop column integration_slug;
