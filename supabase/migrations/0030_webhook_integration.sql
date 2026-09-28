alter table integration_recipients drop constraint integration_recipients_channel_check;
alter table integration_recipients add constraint integration_recipients_channel_check check (channel in ('email', 'sms', 'webhook'));

alter table integration_recipients add column webhook_secret text;
comment on column integration_recipients.webhook_secret is 'Per-target HMAC-SHA256 signing secret for the webhook channel; null for email/sms rows.';
