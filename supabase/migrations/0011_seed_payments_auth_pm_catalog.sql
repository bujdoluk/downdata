insert into catalog (slug, name, host, category) values
  ('square', 'Square', 'issquareup.com', 'payments'),
  ('plaid', 'Plaid', 'status.plaid.com', 'payments'),
  ('wise', 'Wise', 'status.wise.com', 'payments'),
  ('chargebee', 'Chargebee', 'status.chargebee.com', 'payments'),
  ('klarna', 'Klarna', 'status.klarna.com', 'payments'),
  ('clerk', 'Clerk', 'status.clerk.com', 'auth'),
  ('workos', 'WorkOS', 'status.workos.com', 'auth'),
  ('duo', 'Duo Security', 'status.duo.com', 'auth'),
  ('pingidentity', 'Ping Identity', 'status.pingidentity.com', 'auth'),
  ('fusionauth', 'FusionAuth', 'status.fusionauth.io', 'auth'),
  ('asana', 'Asana', 'status.asana.com', 'projectManagement'),
  ('monday', 'monday.com', 'status.monday.com', 'projectManagement'),
  ('smartsheet', 'Smartsheet', 'status.smartsheet.com', 'projectManagement')
on conflict (slug) do nothing;

update catalog set category = 'database' where slug = 'airtable';
update catalog set category = 'infrastructure' where slug = 'webflow';
update catalog set category = 'projectManagement' where slug = 'trello';
