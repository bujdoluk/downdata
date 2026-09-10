alter table report_settings add column test_send_count integer not null default 0;
alter table report_settings add column test_send_window_start timestamptz;

comment on column report_settings.test_send_count is 'Test-email sends within the current window (see test_send_window_start) — resets to 0 (and the window restarts) once an hour has passed since it started.';
