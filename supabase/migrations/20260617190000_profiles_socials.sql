-- Expose verified social handles on the public profiles view so visitors (not
-- just the owner) can see a user's linked GitHub / X. These are verified,
-- already-public handles — safe to expose. The view bypasses RLS on
-- public.users and only selects safe columns. (IDEMPOTENT — safe to re-run.)

create or replace view public.profiles as
select
  id,
  username,
  display_name,
  avatar_url,
  bio,
  reputation,
  created_at,
  github_username,
  x_username
from public.users;

grant select on public.profiles to anon, authenticated;
