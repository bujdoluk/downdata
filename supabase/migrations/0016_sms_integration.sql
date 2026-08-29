-- Adds SMS as a third notification channel (Twilio) alongside Slack and
-- email. Unlike those two, SMS carries a real per-message cost and real
-- intrusiveness, so it gets a second new column: which impact levels
-- actually trigger a text (default major/critical only — see
-- lib/notifyIncidentEvents.ts's sendSms). Both nullable/defaulted,
-- additive — existing Slack/email rows are untouched.
alter table integrations add column recipient_phones text[];
alter table integrations add column notify_impacts text[] not null default '{major,critical}';
comment on column integrations.recipient_phones is 'Recipient phone numbers (E.164) for the sms integration (slug = ''sms''); null/unused for other integrations.';
comment on column integrations.notify_impacts is 'Which incident impact levels (none/minor/major/critical) trigger a notification for this integration; currently only read for slug = ''sms''.';
