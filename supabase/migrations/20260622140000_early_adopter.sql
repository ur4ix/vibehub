-- Early Adopter: the first 100 accounts get the badge + 0% platform fee for life.
-- IDEMPOTENT.

alter table public.users
  add column if not exists early_adopter boolean not null default false;

-- Backfill the earliest 100 existing accounts.
update public.users
  set early_adopter = true
  where id in (select id from public.users order by created_at asc limit 100)
    and early_adopter = false;

-- Auto-grant to new signups until 100 early adopters exist.
create or replace function public.assign_early_adopter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.users where early_adopter) < 100 then
    new.early_adopter := true;
  end if;
  return new;
end;
$$;

drop trigger if exists users_early_adopter on public.users;
create trigger users_early_adopter
  before insert on public.users
  for each row execute function public.assign_early_adopter();

-- Expose the (public) flag on the profiles view (append-only is allowed).
create or replace view public.profiles as
select id, username, display_name, avatar_url, bio, reputation, created_at,
       github_username, x_username, early_adopter
from public.users;
