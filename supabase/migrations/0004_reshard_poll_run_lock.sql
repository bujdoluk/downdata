alter table poll_run_lock rename column id to shard_key;
alter table poll_run_lock alter column shard_key drop default;
alter table poll_run_lock alter column shard_key type text using 'all';

comment on table poll_run_lock is 'Per-shard lock preventing two poll/notify cycles for the same shard from running at once; self-heals after 5 minutes if a run crashed without releasing. shard_key is "all" for an unsharded run, or "{index}/{count}" for a sharded one.';
