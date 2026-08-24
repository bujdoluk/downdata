alter table poll_run_lock add column last_success_at timestamptz;
comment on column poll_run_lock.last_success_at is
  'Set only when a cycle completed with an acceptable incident+maintenance upsert failure rate — distinct from started_at, which updates on every attempt whether it succeeded or not.';
