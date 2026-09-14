-- Password + IP-allowlist protection for a board's public status page
-- (docs/specs/SPEC-status-page-password.md). Both additive to
-- board_status_pages, both nullable/empty by default so no existing status
-- page's visibility changes: password_hash null and allowed_ips empty mean
-- "still fully public," exactly today's behavior.
alter table board_status_pages add column password_hash text;
alter table board_status_pages add column allowed_ips text[] not null default '{}';

comment on column board_status_pages.password_hash is 'Versioned scrypt hash ("scrypt$N$r$p$salt$hash") of the shared password gating this page, or null when password protection is off. Never sent to the client. The unlock cookie''s signing key is derived from this value (see features/status-pages/services/passwordProtection.ts), so changing or clearing the password invalidates every previously issued cookie without a separate version counter.';
comment on column board_status_pages.allowed_ips is 'Exact IP addresses (no CIDR ranges in V1) that bypass the password gate entirely for this page. Empty means no IP-based bypass is configured.';

-- Per-(status page, visitor IP) failed-attempt tracking for the public
-- unlock endpoint (POST /api/public/status/[slug]/unlock) — deliberately
-- keyed by IP, not just status_page_id, so one attacker can't lock out
-- every legitimate visitor of the same page (a global per-page counter
-- would let them). ip_hash, not the raw IP, mirrors this app's existing
-- privacy-conscious defaults elsewhere.
create table status_page_password_attempts (
  id uuid primary key default gen_random_uuid(),
  status_page_id uuid not null references board_status_pages(id) on delete cascade,
  ip_hash text not null,
  failed_count integer not null default 0,
  window_start timestamptz not null default now(),
  unique (status_page_id, ip_hash)
);
comment on table status_page_password_attempts is 'Fixed-window failed-attempt counter for the public status-page unlock endpoint, same shape as report_settings.test_send_count/test_send_window_start (0033) but keyed per visitor IP rather than per account, since this is public/unauthenticated. No ownership column and no client-facing read/write path — service-role only, same class as catalog/incidents (see AGENTS.md), so RLS is enabled with no policies at all: fully locked down for anon/authenticated, unaffected for the service-role key which bypasses RLS.';

alter table status_page_password_attempts enable row level security;
