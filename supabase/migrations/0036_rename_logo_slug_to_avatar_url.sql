-- 0035's logo_slug anticipated a pick-from-SERVICE_LOGOS picker; that
-- shipped this same session as an upload flow instead (mirroring the
-- existing Background image field), so the column now holds a Storage URL,
-- not a catalog slug. Renamed rather than left misleading — no real post
-- has ever set this column (the picker never shipped to the public form
-- before this rename), so there's no data to actually migrate.
alter table blog_posts rename column logo_slug to avatar_url;
