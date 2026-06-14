-- Idempotent avatars bucket + policies
-- Safe to re-run; drops old policies first to avoid "already exists" errors.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Drop old policies in case they exist from a previous migration attempt
drop policy if exists "users can upload own avatar"  on storage.objects;
drop policy if exists "users can update own avatar"  on storage.objects;
drop policy if exists "avatars are publicly readable" on storage.objects;

-- Upload: authenticated users can insert into their own folder
create policy "users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update: authenticated users can overwrite their own avatar
create policy "users can update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read: public
create policy "avatars are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
