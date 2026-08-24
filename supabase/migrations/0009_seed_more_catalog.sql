-- 5 more services per existing category (infrastructure, devtools,
-- database, communication, ai, other), same shape as 0003's seed. Every
-- host below was verified live against its own /api/v2/status.json before
-- being added here — several obvious-looking guesses (e.g. status.heroku.com,
-- status.redis.com, status.docker.com) turned out to not be real Statuspage
-- hosts and were dropped rather than included on assumption.
insert into catalog (slug, name, host, category) values
  -- devtools
  ('sentry', 'Sentry', 'status.sentry.io', 'devtools'),
  ('postman', 'Postman', 'status.postman.com', 'devtools'),
  ('newrelic', 'New Relic', 'status.newrelic.com', 'devtools'),
  ('bitbucket', 'Bitbucket', 'bitbucket.status.atlassian.com', 'devtools'),
  ('launchdarkly', 'LaunchDarkly', 'status.launchdarkly.com', 'devtools'),
  -- database
  ('elastic', 'Elastic', 'status.elastic.co', 'database'),
  ('snowflake', 'Snowflake', 'status.snowflake.com', 'database'),
  ('cockroachdb', 'CockroachDB', 'status.cockroachlabs.cloud', 'database'),
  ('confluent', 'Confluent', 'status.confluent.cloud', 'database'),
  ('pinecone', 'Pinecone', 'status.pinecone.io', 'database'),
  -- infrastructure
  ('render', 'Render', 'status.render.com', 'infrastructure'),
  ('linode', 'Linode', 'status.linode.com', 'infrastructure'),
  ('cloudinary', 'Cloudinary', 'status.cloudinary.com', 'infrastructure'),
  ('bunny', 'Bunny.net', 'status.bunny.net', 'infrastructure'),
  ('wasabi', 'Wasabi', 'status.wasabi.com', 'infrastructure'),
  -- communication
  ('sendgrid', 'SendGrid', 'status.sendgrid.com', 'communication'),
  ('mailgun', 'Mailgun', 'status.mailgun.com', 'communication'),
  ('klaviyo', 'Klaviyo', 'status.klaviyo.com', 'communication'),
  ('brevo', 'Brevo', 'status.brevo.com', 'communication'),
  ('plivo', 'Plivo', 'status.plivo.com', 'communication'),
  -- ai
  ('anthropic', 'Anthropic', 'status.claude.com', 'ai'),
  ('elevenlabs', 'ElevenLabs', 'status.elevenlabs.io', 'ai'),
  ('cohere', 'Cohere', 'status.cohere.com', 'ai'),
  ('stabilityai', 'Stability AI', 'status.stability.ai', 'ai'),
  ('groq', 'Groq', 'groqstatus.com', 'ai'),
  -- other
  ('notion', 'Notion', 'www.notion-status.com', 'other'),
  ('figma', 'Figma', 'status.figma.com', 'other'),
  ('airtable', 'Airtable', 'status.airtable.com', 'other'),
  ('webflow', 'Webflow', 'status.webflow.com', 'other'),
  ('trello', 'Trello', 'trello.status.atlassian.com', 'other')
on conflict (slug) do nothing;
