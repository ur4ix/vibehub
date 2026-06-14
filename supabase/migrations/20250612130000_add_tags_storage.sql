-- Add tags to repositories
alter table public.repositories
  add column tags text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- Storage bucket for repository ZIP archives
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'repositories',
  'repositories',
  false,
  array[
    'application/zip',
    'application/x-zip-compressed',
    'application/x-zip',
    'application/octet-stream'
  ],
  52428800  -- 50 MB
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Storage RLS
-- Path convention: {owner_id}/{repository_id}/source.zip
-- ---------------------------------------------------------------------------

create policy "owners can upload repository files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'repositories'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "owners can update own repository files"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'repositories'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "owners can delete own repository files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'repositories'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Read: owner always; authenticated users for free published repos;
-- buyers with a completed purchase for paid repos.
create policy "users can read repository files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'repositories'
    and (
      -- owner
      auth.uid()::text = (string_to_array(name, '/'))[1]
      -- free & published
      or exists (
        select 1
        from public.repositories r
        where r.id = (string_to_array(name, '/'))[2]::uuid
          and r.type = 'free'
          and r.is_published = true
      )
      -- paid with completed purchase
      or exists (
        select 1
        from public.repositories r
        join public.purchases p on p.repository_id = r.id
        where r.id = (string_to_array(name, '/'))[2]::uuid
          and p.buyer_id = auth.uid()
          and p.status = 'completed'
      )
    )
  );
