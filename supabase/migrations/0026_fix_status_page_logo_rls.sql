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
