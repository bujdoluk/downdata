alter table integrations add column recipient_emails text[];
comment on column integrations.recipient_emails is 'Recipient addresses for the email integration (slug = ''email''); null/unused for other integrations.';
