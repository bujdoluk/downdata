-- poll_run_lock was a single global lock (one row, id always `true`).
-- Catalog-wide polling can now run as multiple concurrent shards
-- (?shard=0&shards=4, ?shard=1&shards=4, ...), so the lock needs to be
-- per-shard instead of one row for the whole cron. Non-destructive: alters
-- the existing table in place rather than dropping it, so the running/
-- started_at columns and their current values survive untouched — only
-- the primary key column is renamed and widened from boolean to text.
-- Run this once, same as 0001/0002/0003.
alter table poll_run_lock rename column id to shard_key;
alter table poll_run_lock alter column shard_key drop default;
-- The only value this column has ever held is `true` (the old singleton
-- lock's fixed id) — mapped to "all", the shard_key the route uses for an
-- unsharded run, so today's one existing row keeps working as-is.
alter table poll_run_lock alter column shard_key type text using 'all';

comment on table poll_run_lock is 'Per-shard lock preventing two poll/notify cycles for the same shard from running at once; self-heals after 5 minutes if a run crashed without releasing. shard_key is "all" for an unsharded run, or "{index}/{count}" for a sharded one.';
