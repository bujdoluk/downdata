-- Recipient verification. Today recipient_emails/recipient_phones are
-- plain text[] columns — any signed-in account could point notifications
-- at any address/number with nothing verifying it's actually theirs.
-- That's a real abuse surface for a public SaaS (sending real Slack/SMS/
-- email traffic, at this app's Twilio/Resend cost, to a stranger who
-- never consented). Per-recipient state (pending vs. verified, a code/
-- token, an expiry) doesn't fit a plain array anymore, so it gets its
-- own table.
create table integration_recipients (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references integrations(id) on delete cascade,
  channel text not null check (channel in ('email', 'sms')),
  value text not null,
  verified boolean not null default false,
  verification_code text,
  verification_expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (integration_id, value)
);
comment on table integration_recipients is 'Per-recipient verification state for the email/sms integrations — the notifier only ever sends to verified = true rows.';
alter table integration_recipients enable row level security;

-- Ownership is via the parent integration, not a user_id column of its
-- own — a recipient row is yours exactly when the integration it belongs
-- to is yours, same chain integrations already uses.
create policy integration_recipients_select on integration_recipients for select
  to authenticated
  using (exists (select 1 from integrations i where i.id = integration_recipients.integration_id and i.user_id = (select auth.uid())));

create policy integration_recipients_insert on integration_recipients for insert
  to authenticated
  with check (exists (select 1 from integrations i where i.id = integration_recipients.integration_id and i.user_id = (select auth.uid())));

create policy integration_recipients_update on integration_recipients for update
  to authenticated
  using (exists (select 1 from integrations i where i.id = integration_recipients.integration_id and i.user_id = (select auth.uid())))
  with check (exists (select 1 from integrations i where i.id = integration_recipients.integration_id and i.user_id = (select auth.uid())));

create policy integration_recipients_delete on integration_recipients for delete
  to authenticated
  using (exists (select 1 from integrations i where i.id = integration_recipients.integration_id and i.user_id = (select auth.uid())));

-- Existing recipients are your own already-working contacts from before
-- this feature existed, not new unverified submissions — grandfathered
-- in as verified = true so this migration doesn't cut off your own
-- notifications pending a re-confirmation you never asked for.
insert into integration_recipients (integration_id, channel, value, verified)
select id, 'email', unnest(recipient_emails), true from integrations where recipient_emails is not null;

insert into integration_recipients (integration_id, channel, value, verified)
select id, 'sms', unnest(recipient_phones), true from integrations where recipient_phones is not null;

alter table integrations drop column recipient_emails;
alter table integrations drop column recipient_phones;
