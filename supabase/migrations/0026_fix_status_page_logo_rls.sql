-- Fixes a genuine RLS bug in 0025_board_status_pages.sql: the
-- status-page-logos storage policies checked ownership via an `exists`
-- subquery against `boards` (a different public-schema table). That shape
-- reliably fails for storage.objects policies even when the board really
-- is owned by the caller — reproduced directly against the live database:
-- the same authenticated session could plainly SELECT its own board, but
-- got "new row violates row-level security policy" on every upload to
-- that exact board's logo path. The avatars bucket's policy (a flat
-- auth.uid() comparison, no cross-table lookup) has never had this
-- problem, so this moves status-page-logos onto the same flat-comparison
-- shape: uploads now go to <user_id>/<board_id>/logo instead of
-- <board_id>/logo, so ownership is checked directly against auth.uid(),
-- exactly like avatars, with no subquery into `boards` at all.

drop policy if exists status_page_logos_insert on storage.objects;
drop policy if exists status_page_logos_update on storage.objects;
drop policy if exists status_page_logos_delete on storage.objects;

create policy status_page_logos_insert on storage.objects for insert
  to authenticated
  with check (bucket_id = 'status-page-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy status_page_logos_update on storage.objects for update
  to authenticated
  using (bucket_id = 'status-page-logos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'status-page-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy status_page_logos_delete on storage.objects for delete
  to authenticated
  using (bucket_id = 'status-page-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
