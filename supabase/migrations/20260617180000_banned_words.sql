-- ═════════════════════════════════════════════════════════════════════════════
-- Server-side banned-word enforcement  (IDEMPOTENT — safe to re-run)
--
-- The client filter (lib/banned-words.ts) is good UX but can be bypassed by
-- calling the API directly. This makes the rule a real boundary in Postgres:
--   • banned_words table (admin-manageable) holds the list,
--   • contains_banned() mirrors the client matcher (leet + separators + repeats,
--     loose/exact tiers + Cyrillic stems) and is SECURITY DEFINER so triggers
--     can read the list regardless of the caller's RLS,
--   • BEFORE triggers reject inserts/updates on user content,
--   • username is validated in handle_new_user() and save_profile().
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── word list ───────────────────────────────────────────────────────────────
create table if not exists public.banned_words (
  word text not null,
  mode text not null default 'exact' check (mode in ('loose', 'exact', 'stem')),
  primary key (word, mode)
);

alter table public.banned_words enable row level security;

-- Only admins can read/manage the list (the matcher below bypasses RLS).
drop policy if exists "admins manage banned words" on public.banned_words;
create policy "admins manage banned words"
  on public.banned_words for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.banned_words to authenticated;

insert into public.banned_words (word, mode) values
  -- loose (prefix match: also catches shitty / fucked / bitches)
  ('fuck','loose'), ('shit','loose'), ('bullshit','loose'), ('bitch','loose'),
  ('cunt','loose'), ('motherfuck','loose'), ('asshole','loose'), ('arsehole','loose'),
  ('wanker','loose'), ('whore','loose'), ('slut','loose'), ('faggot','loose'),
  ('nigger','loose'), ('nigga','loose'), ('tranny','loose'), ('dickhead','loose'),
  ('bastard','loose'), ('phishing','loose'), ('scammer','loose'), ('drainer','loose'),
  -- exact (whole-word: avoids cocktail / rapeseed / retardant / raccoon)
  ('fuk','exact'), ('cock','exact'), ('dick','exact'), ('fag','exact'),
  ('coon','exact'), ('spic','exact'), ('chink','exact'), ('kike','exact'),
  ('nazi','exact'), ('pussy','exact'), ('retard','exact'), ('retarded','exact'),
  ('rape','exact'), ('rapist','exact'), ('porn','exact'), ('pedo','exact'),
  ('pedophile','exact'), ('paedophile','exact'), ('cp','exact'),
  ('jerkoff','exact'), ('ratware','exact'),
  -- stem (substring on stripped text — Cyrillic мат + harshest slurs)
  ('nigger','stem'), ('nigga','stem'), ('faggot','stem'),
  ('хуй','stem'), ('хуя','stem'), ('хуе','stem'), ('хуё','stem'), ('хуи','stem'),
  ('пизд','stem'), ('бляд','stem'), ('блят','stem'), ('еба','stem'), ('ёба','stem'),
  ('ебл','stem'), ('ебан','stem'), ('ебуч','stem'), ('сука','stem'), ('суки','stem'),
  ('залуп','stem'), ('мудак','stem'), ('мудач','stem'), ('пидор','stem'),
  ('пидар','stem'), ('пидр','stem'), ('гандон','stem'), ('гондон','stem'),
  ('долбоеб','stem'), ('долбоёб','stem'), ('выеб','stem'), ('наеб','stem'),
  ('уеба','stem'), ('манда','stem'), ('шлюх','stem'), ('хуйн','stem'), ('ублюд','stem')
on conflict (word, mode) do nothing;

-- ─── normalisation (pure) ────────────────────────────────────────────────────
create or replace function public.bw_normalize(t text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(
           regexp_replace(
             regexp_replace(
               translate(lower(coalesce(t, '')),
                         '4@31!|05$78', 'aaeiiiosstb'),
               '[^a-z0-9а-яё]+', ' ', 'g'),     -- separators → space
             '(.)\1{2,}', '\1', 'g'),           -- collapse 3+ repeats
           '\s+', ' ', 'g'));
$$;

-- ─── matcher (reads the list; SECURITY DEFINER to bypass RLS) ────────────────
create or replace function public.contains_banned(t text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  norm     text;
  stripped text;
  w        record;
begin
  if t is null or t = '' then
    return false;
  end if;
  norm := public.bw_normalize(t);
  stripped := replace(norm, ' ', '');

  for w in select word, mode from public.banned_words loop
    if w.mode = 'loose' then
      if norm ~ ('(^| )' || w.word) then return true; end if;
    elsif w.mode = 'exact' then
      if norm ~ ('(^| )' || w.word || '( |$)') then return true; end if;
    else -- stem
      if position(w.word in stripped) > 0 then return true; end if;
    end if;
  end loop;

  return false;
end;
$$;

grant execute on function public.bw_normalize(text)  to authenticated, anon;
grant execute on function public.contains_banned(text) to authenticated, anon;

-- ─── content triggers ────────────────────────────────────────────────────────
create or replace function public.bw_guard()
returns trigger
language plpgsql
as $$
begin
  -- TG_ARGV holds the column names to check for this table.
  if exists (
    select 1 from unnest(tg_argv) col
    where public.contains_banned( (to_jsonb(new) ->> col) )
  ) then
    raise exception 'Content contains language that is not allowed'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Helper note: array columns (tags) are stored as JSON arrays in to_jsonb, so we
-- check them via a dedicated wrapper that flattens to text.
create or replace function public.bw_guard_with_tags()
returns trigger
language plpgsql
as $$
declare
  tag text;
begin
  if exists (
    select 1 from unnest(tg_argv) col
    where public.contains_banned( (to_jsonb(new) ->> col) )
  ) then
    raise exception 'Content contains language that is not allowed'
      using errcode = 'check_violation';
  end if;
  if new.tags is not null then
    foreach tag in array new.tags loop
      if public.contains_banned(tag) then
        raise exception 'Content contains language that is not allowed'
          using errcode = 'check_violation';
      end if;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists repositories_bw on public.repositories;
create trigger repositories_bw before insert or update on public.repositories
  for each row execute function public.bw_guard_with_tags('title', 'slug', 'description');

drop trigger if exists jobs_bw on public.jobs;
create trigger jobs_bw before insert or update on public.jobs
  for each row execute function public.bw_guard_with_tags('title', 'description');

drop trigger if exists orders_bw on public.orders;
create trigger orders_bw before insert or update on public.orders
  for each row execute function public.bw_guard_with_tags('title', 'description');

drop trigger if exists job_applications_bw on public.job_applications;
create trigger job_applications_bw before insert or update on public.job_applications
  for each row execute function public.bw_guard('message');

drop trigger if exists order_bids_bw on public.order_bids;
create trigger order_bids_bw before insert or update on public.order_bids
  for each row execute function public.bw_guard('message');

drop trigger if exists reviews_bw on public.reviews;
create trigger reviews_bw before insert or update on public.reviews
  for each row execute function public.bw_guard('comment');

drop trigger if exists posts_bw on public.posts;
create trigger posts_bw before insert or update on public.posts
  for each row execute function public.bw_guard('title', 'slug', 'excerpt', 'body');

-- ─── username validation in profile save (re-create with the check) ──────────
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

  if public.contains_banned(p_username)
     or public.contains_banned(p_display_name)
     or public.contains_banned(p_bio) then
    raise exception 'Content contains language that is not allowed';
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

-- ─── username validation on signup (re-create with the check) ────────────────
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

  -- Don't let a banned handle through; fall back to a neutral base.
  if public.contains_banned(base_username) then
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

-- ═════════════════════════════════════════════════════════════════════════════
-- Quick test (optional):
--   select public.contains_banned('clean project title');      -- false
--   select public.contains_banned('this is shitty');           -- true
--   select public.contains_banned('cocktail recipe assistant');-- false
-- ═════════════════════════════════════════════════════════════════════════════
