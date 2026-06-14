-- Allow authenticated users to insert their own profile row.
-- Needed when the handle_new_user trigger didn't fire (e.g. on older accounts).

create policy "users can insert own row"
  on public.users
  for insert
  to authenticated
  with check (auth.uid() = id);

grant insert (id, username, display_name, avatar_url, bio, github_username, huggingface_username, x_username)
  on public.users to authenticated;
