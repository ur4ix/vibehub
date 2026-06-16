-- Restore the canonical handle_new_user(). A stripped-down version had been
-- deployed that inserted only (id, created_at) into public.users — but
-- users.username is NOT NULL, so every signup failed with
-- "Database error saving new user". This version generates a valid, unique
-- username and pulls display_name / avatar_url from the OAuth metadata.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate_username text;
  suffix integer := 0;
begin
  base_username := lower(
    regexp_replace(
      coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
      '[^a-z0-9_]', '_', 'g'
    )
  );

  if char_length(base_username) < 3 then
    base_username := 'user';
  end if;

  base_username := left(base_username, 26);
  candidate_username := base_username;

  while exists (select 1 from public.users where username = candidate_username) loop
    suffix := suffix + 1;
    candidate_username := base_username || suffix::text;
  end loop;

  insert into public.users (id, username, display_name, avatar_url)
  values (
    new.id,
    candidate_username,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
