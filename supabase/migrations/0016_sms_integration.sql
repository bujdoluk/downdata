alter table integrations add column recipient_phones text[];
alter table integrations add column notify_impacts text[] not null default '{major,critical}';
comment on column integrations.recipient_phones is 'Recipient phone numbers (E.164) for the sms integration (slug = ''sms''); null/unused for other integrations.';
comment on column integrations.notify_impacts is 'Which incident impact levels (none/minor/major/critical) trigger a notification for this integration; currently only read for slug = ''sms''.';
