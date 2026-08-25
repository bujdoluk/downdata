-- New categories: payments, auth, projectManagement. Every host below was
-- verified live against its own /api/v2/status.json (and its page.name
-- checked against the actual company) before being added, same discipline
-- as 0009. Dropped as not real/reachable Statuspage hosts: Stripe, PayPal,
-- Braintree, Adyen (all return HTML, not Statuspage JSON), Auth0, Okta
-- (404/401 under the obvious hostnames), Linear, ClickUp, Basecamp, Wrike,
-- Jira (same).
insert into catalog (slug, name, host, category) values
  -- payments
  ('square', 'Square', 'issquareup.com', 'payments'),
  ('plaid', 'Plaid', 'status.plaid.com', 'payments'),
  ('wise', 'Wise', 'status.wise.com', 'payments'),
  ('chargebee', 'Chargebee', 'status.chargebee.com', 'payments'),
  ('klarna', 'Klarna', 'status.klarna.com', 'payments'),
  -- auth
  ('clerk', 'Clerk', 'status.clerk.com', 'auth'),
  ('workos', 'WorkOS', 'status.workos.com', 'auth'),
  ('duo', 'Duo Security', 'status.duo.com', 'auth'),
  ('pingidentity', 'Ping Identity', 'status.pingidentity.com', 'auth'),
  ('fusionauth', 'FusionAuth', 'status.fusionauth.io', 'auth'),
  -- projectManagement (Trello was previously miscategorized as "other")
  ('asana', 'Asana', 'status.asana.com', 'projectManagement'),
  ('monday', 'monday.com', 'status.monday.com', 'projectManagement'),
  ('smartsheet', 'Smartsheet', 'status.smartsheet.com', 'projectManagement')
on conflict (slug) do nothing;

-- Recategorize existing "other" entries that actually fit an established
-- (or newly-added) category better than the catch-all.
update catalog set category = 'database' where slug = 'airtable';
update catalog set category = 'infrastructure' where slug = 'webflow';
update catalog set category = 'projectManagement' where slug = 'trello';
