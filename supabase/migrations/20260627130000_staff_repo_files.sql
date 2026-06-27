-- Let staff (admins + moderators) read repository files without buying — needed
-- to inspect/moderate what's actually inside an archive. IDEMPOTENT.
--
-- Storage SELECT policies are OR-ed, so this only widens access for staff; normal
-- users are unaffected (owner / free-published / purchased rules still apply).
drop policy if exists "staff can read repository files" on storage.objects;
create policy "staff can read repository files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'repositories' and public.is_staff());
