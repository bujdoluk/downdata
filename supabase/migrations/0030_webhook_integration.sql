-- Generic outgoing webhook integration — a fourth notification channel
-- alongside Slack/Email/SMS. Unlike email/SMS, a webhook target has no
-- "prove you own this" verification step (there's no human on the other
-- end to click a link or read back a code) — its abuse vector is SSRF, not
-- spamming a stranger, so it's guarded by URL validation at add-time *and*
-- send-time instead (see lib/validateWebhookUrl.ts), not a verified flag.
-- It reuses integration_recipients (already "one integration, many
-- targets" for email/sms) rather than a new table — a webhook target is
-- exactly that shape, just with a URL as the value and its own signing
-- secret instead of verification state.
alter table integration_recipients drop constraint integration_recipients_channel_check;
alter table integration_recipients add constraint integration_recipients_channel_check check (channel in ('email', 'sms', 'webhook'));

-- Per-target HMAC secret (not one shared secret for the whole account) —
-- matches GitHub/Stripe's own convention: leaking one receiver's secret
-- doesn't compromise every other webhook this account has configured.
-- Null for email/sms rows, same nullable-per-channel pattern
-- recipient_emails/recipient_phones used before 0019 normalized them.
alter table integration_recipients add column webhook_secret text;
comment on column integration_recipients.webhook_secret is 'Per-target HMAC-SHA256 signing secret for the webhook channel; null for email/sms rows.';

-- Webhook rows are inserted already-live (addWebhookTarget explicitly sets
-- verified: true) — the test ping that gates saving happens before the
-- insert, not after, so there's no "pending" state to represent the way
-- email/sms's verified=false is. No column-default change needed: email/sms
-- already always pass verified explicitly on insert, so this doesn't touch
-- their behavior either way.
