-- Profile picture storage. Public bucket: avatars are meant to be visible
-- (rendered in the sidebar), so reads go through Storage's public object
-- URL, which bypasses RLS by design for a public bucket — the policies
-- below only need to cover writes.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Every avatar lives at a fixed path per user (<user_id>/avatar, no
-- extension — content-type is set explicitly on upload, so the URL
-- doesn't need one), which is what (storage.foldername(name))[1] checks
-- against. A fixed path also means re-uploading is a plain upsert, not an
-- accumulating pile of old files to clean up.

create policy avatars_select on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy avatars_insert on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Upsert (re-uploading a new photo over the old one) needs update, not
-- just insert — insert-only silently no-ops on an existing key.
create policy avatars_update on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_delete on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
