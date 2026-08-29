-- Adds email as a second notification channel alongside Slack (see
-- lib/notifyIncidentEvents.ts's "one place a second channel would get its
-- own branch later" comment). Unlike Slack's single webhook_url, an email
-- integration has no OAuth-issued destination — it stores the recipient
-- addresses the Integrations page form collects directly. Nullable and
-- additive: existing Slack rows are untouched, webhook_url stays not-null
-- for them.
alter table integrations add column recipient_emails text[];
comment on column integrations.recipient_emails is 'Recipient addresses for the email integration (slug = ''email''); null/unused for other integrations.';
