-- ─────────────────────────────────────────────────────────────────────────────
-- Verified social handles via OAuth identity linking.
--
-- Social usernames are no longer free text. They are derived from the verified
-- `auth.identities` row that Supabase creates when a user links a provider
-- (supabase.auth.linkIdentity). Because the only writer is this SECURITY DEFINER
-- function — and `authenticated` has no column UPDATE grant on these columns
-- (see 20250612120001_rls_policies.sql) — a user cannot claim someone else's
-- handle by typing it.
--
-- Providers: GitHub ('github') and X/Twitter ('twitter'). Hugging Face is
-- removed (no native Supabase OAuth provider).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop the Hugging Face column. save_profile (which referenced it) is
--    replaced below, so drop the old 6-arg version first to avoid a dangling
--    reference, then drop the column.

drop function if exists public.save_profile(text, text, text, text, text, text);

alter table public.users drop column if exists huggingface_username;

-- 1a. Close the spoofing hole: earlier migrations granted `authenticated`
--     direct UPDATE/INSERT on the social columns, which would let a user write
--     any handle via PostgREST. Revoke those — sync_verified_socials() (SECURITY
--     DEFINER) is now the only writer, and it only ever copies verified values
--     from auth.identities. (The huggingface_username grants vanish with the
--     dropped column.)

revoke update (github_username, x_username) on public.users from authenticated;
revoke insert (github_username, x_username) on public.users from authenticated;

-- 2. Profile save now only handles the free-text fields. Social handles are
--    managed exclusively through linked identities + sync_verified_socials().

create or replace function public.save_profile(
  p_username     text,
  p_display_name text,
  p_bio          text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.users (id, username, display_name, bio)
  values (auth.uid(), p_username, p_display_name, p_bio)
  on conflict (id) do update set
    username     = excluded.username,
    display_name = excluded.display_name,
    bio          = excluded.bio,
    updated_at   = now();
end;
$$;

grant execute on function public.save_profile(text, text, text) to authenticated;

-- 3. Copy verified handles from auth.identities into public.users for the
--    current user. Idempotent: also NULLs a handle when its identity has been
--    unlinked, so it doubles as the disconnect path. Returns the resulting
--    handles so the client can update its UI without a second round-trip.

create or replace function public.sync_verified_socials()
returns table (github_username text, x_username text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_github text;
  v_x      text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- GitHub stores the login under user_name / preferred_username.
  select coalesce(
           i.identity_data ->> 'user_name',
           i.identity_data ->> 'preferred_username',
           i.identity_data ->> 'nickname'
         )
    into v_github
  from auth.identities i
  where i.user_id = auth.uid()
    and i.provider = 'github'
  limit 1;

  -- X/Twitter stores the handle under user_name / screen_name.
  select coalesce(
           i.identity_data ->> 'user_name',
           i.identity_data ->> 'preferred_username',
           i.identity_data ->> 'screen_name',
           i.identity_data ->> 'nickname'
         )
    into v_x
  from auth.identities i
  where i.user_id = auth.uid()
    and i.provider = 'twitter'
  limit 1;

  update public.users u
     set github_username = v_github,
         x_username      = v_x,
         updated_at      = now()
   where u.id = auth.uid();

  return query select v_github, v_x;
end;
$$;

grant execute on function public.sync_verified_socials() to authenticated;
