-- ═════════════════════════════════════════════════════════════════════════════
-- VYDEX — consolidated pending migrations  (FULLY IDEMPOTENT — safe to re-run)
--
-- Paste this whole file into the Supabase SQL Editor and run once. It brings the
-- database up to date with every recent feature. Re-running is harmless: tables
-- use `if not exists`, policies are dropped before recreate, functions use
-- `create or replace`, triggers use `drop trigger if exists`.
--
-- Sections:
--   1. notifications        (table the feature triggers write into)
--   2. repo AI provenance   (ai_assisted / ai_tools on repositories)
--   3. repository versions  (version history)
--   4. event notifications  (likes / forks / reviews → notifications)
--   5. follows              (follow users + notify)
--   6. applications & bids   (hire applications / order bids + counters + notify)
--   7. admin                (admin read access + reputation RPC)
-- ═════════════════════════════════════════════════════════════════════════════


-- ── 1. notifications ─────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users on delete cascade,
  type       text not null default 'system',
  title      text not null,
  body       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "users can read own notifications" on public.notifications;
create policy "users can read own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users can update own notifications" on public.notifications;
create policy "users can update own notifications"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;

create or replace function public.create_welcome_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, title, body)
  values (new.id, 'system', 'Welcome to Vydex!',
          'Your account is set up. Start by publishing your first project.');
  return new;
end; $$;

drop trigger if exists on_user_created_notification on public.users;
create trigger on_user_created_notification
  after insert on public.users
  for each row execute function public.create_welcome_notification();


-- ── 2. repository AI provenance ──────────────────────────────────────────────
alter table public.repositories
  add column if not exists ai_assisted boolean not null default false,
  add column if not exists ai_tools    text[]  not null default '{}';


-- ── 3. repository versions ───────────────────────────────────────────────────
create table if not exists public.repository_versions (
  id            uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.repositories (id) on delete cascade,
  version       text not null,
  changelog     text,
  storage_path  text not null,
  price_cents   integer check (price_cents is null or price_cents >= 0),
  created_at    timestamptz not null default now(),
  constraint repository_versions_unique unique (repository_id, version)
);

create index if not exists repository_versions_repo_idx
  on public.repository_versions (repository_id, created_at desc);

alter table public.repository_versions enable row level security;

drop policy if exists "versions readable when repo is visible" on public.repository_versions;
create policy "versions readable when repo is visible"
  on public.repository_versions for select
  using (exists (
    select 1 from public.repositories r
    where r.id = repository_id and (r.is_published = true or r.owner_id = auth.uid())
  ));

drop policy if exists "owners manage repository versions" on public.repository_versions;
create policy "owners manage repository versions"
  on public.repository_versions for all
  to authenticated
  using (exists (
    select 1 from public.repositories r where r.id = repository_id and r.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.repositories r where r.id = repository_id and r.owner_id = auth.uid()
  ));

grant select on public.repository_versions to anon, authenticated;
grant insert, update, delete on public.repository_versions to authenticated;


-- ── 4. event notifications (likes / forks / reviews) ─────────────────────────
create or replace function public.notify_on_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_actor text;
begin
  select r.owner_id, r.title into v_owner, v_title from public.repositories r where r.id = new.repository_id;
  if v_owner is null or v_owner = new.user_id then return new; end if;
  select username into v_actor from public.users where id = new.user_id;
  insert into public.notifications (user_id, type, title, body)
  values (v_owner, 'like', 'New like', '@' || coalesce(v_actor, 'someone') || ' liked "' || v_title || '"');
  return new;
end; $$;

drop trigger if exists reactions_notify on public.reactions;
create trigger reactions_notify after insert on public.reactions
  for each row execute function public.notify_on_reaction();

create or replace function public.notify_on_fork()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_actor text;
begin
  select r.owner_id, r.title into v_owner, v_title from public.repositories r where r.id = new.original_repository_id;
  if v_owner is null or v_owner = new.forked_by then return new; end if;
  select username into v_actor from public.users where id = new.forked_by;
  insert into public.notifications (user_id, type, title, body)
  values (v_owner, 'fork', 'New fork', '@' || coalesce(v_actor, 'someone') || ' forked "' || v_title || '"');
  return new;
end; $$;

drop trigger if exists forks_notify on public.forks;
create trigger forks_notify after insert on public.forks
  for each row execute function public.notify_on_fork();

create or replace function public.notify_on_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_actor text;
begin
  select r.owner_id, r.title into v_owner, v_title from public.repositories r where r.id = new.repository_id;
  if v_owner is null or v_owner = new.reviewer_id then return new; end if;
  select username into v_actor from public.users where id = new.reviewer_id;
  insert into public.notifications (user_id, type, title, body)
  values (v_owner, 'review', 'New review', '@' || coalesce(v_actor, 'someone') || ' reviewed "' || v_title || '"');
  return new;
end; $$;

drop trigger if exists reviews_notify on public.reviews;
create trigger reviews_notify after insert on public.reviews
  for each row execute function public.notify_on_review();


-- ── 5. follows ───────────────────────────────────────────────────────────────
create table if not exists public.follows (
  id           bigint generated always as identity primary key,
  follower_id  uuid not null references public.users (id) on delete cascade,
  following_id uuid not null references public.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint follows_unique unique (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows (following_id);
create index if not exists follows_follower_idx  on public.follows (follower_id);

alter table public.follows enable row level security;

drop policy if exists "follows are readable" on public.follows;
create policy "follows are readable" on public.follows for select using (true);

drop policy if exists "users can follow" on public.follows;
create policy "users can follow" on public.follows for insert
  to authenticated with check (follower_id = auth.uid());

drop policy if exists "users can unfollow" on public.follows;
create policy "users can unfollow" on public.follows for delete
  to authenticated using (follower_id = auth.uid());

grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;

create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor text;
begin
  select username into v_actor from public.users where id = new.follower_id;
  insert into public.notifications (user_id, type, title, body)
  values (new.following_id, 'follow', 'New follower',
          '@' || coalesce(v_actor, 'someone') || ' started following you');
  return new;
end; $$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify after insert on public.follows
  for each row execute function public.notify_on_follow();


-- ── 6. job applications & order bids ─────────────────────────────────────────
create table if not exists public.job_applications (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references public.jobs  on delete cascade,
  applicant_id uuid not null references public.users on delete cascade,
  message      text not null,
  created_at   timestamptz not null default now(),
  unique (job_id, applicant_id)
);
alter table public.job_applications enable row level security;

drop policy if exists "applicants can apply to open jobs" on public.job_applications;
create policy "applicants can apply to open jobs" on public.job_applications for insert
  to authenticated with check (
    auth.uid() = applicant_id
    and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open')
  );

drop policy if exists "applicants can read own applications" on public.job_applications;
create policy "applicants can read own applications" on public.job_applications for select
  to authenticated using (auth.uid() = applicant_id);

drop policy if exists "job owners can read applications" on public.job_applications;
create policy "job owners can read applications" on public.job_applications for select
  to authenticated using (exists (select 1 from public.jobs j where j.id = job_id and j.owner_id = auth.uid()));

drop policy if exists "applicants can withdraw applications" on public.job_applications;
create policy "applicants can withdraw applications" on public.job_applications for delete
  to authenticated using (auth.uid() = applicant_id);

grant select, insert, delete on public.job_applications to authenticated;

create table if not exists public.order_bids (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders on delete cascade,
  bidder_id  uuid not null references public.users  on delete cascade,
  amount     numeric not null check (amount > 0),
  message    text not null,
  created_at timestamptz not null default now(),
  unique (order_id, bidder_id)
);
alter table public.order_bids enable row level security;

drop policy if exists "bidders can bid on open orders" on public.order_bids;
create policy "bidders can bid on open orders" on public.order_bids for insert
  to authenticated with check (
    auth.uid() = bidder_id
    and exists (select 1 from public.orders o where o.id = order_id and o.status = 'open')
  );

drop policy if exists "bidders can read own bids" on public.order_bids;
create policy "bidders can read own bids" on public.order_bids for select
  to authenticated using (auth.uid() = bidder_id);

drop policy if exists "order owners can read bids" on public.order_bids;
create policy "order owners can read bids" on public.order_bids for select
  to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.owner_id = auth.uid()));

drop policy if exists "bidders can withdraw bids" on public.order_bids;
create policy "bidders can withdraw bids" on public.order_bids for delete
  to authenticated using (auth.uid() = bidder_id);

grant select, insert, delete on public.order_bids to authenticated;

create or replace function public.sync_applicants_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.jobs set applicants_count = applicants_count + 1 where id = new.job_id;
    return new;
  else
    update public.jobs set applicants_count = greatest(0, applicants_count - 1) where id = old.job_id;
    return old;
  end if;
end; $$;

drop trigger if exists job_applications_count on public.job_applications;
create trigger job_applications_count after insert or delete on public.job_applications
  for each row execute function public.sync_applicants_count();

create or replace function public.sync_bids_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.orders set bids_count = bids_count + 1 where id = new.order_id;
    return new;
  else
    update public.orders set bids_count = greatest(0, bids_count - 1) where id = old.order_id;
    return old;
  end if;
end; $$;

drop trigger if exists order_bids_count on public.order_bids;
create trigger order_bids_count after insert or delete on public.order_bids
  for each row execute function public.sync_bids_count();

create or replace function public.notify_on_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_actor text;
begin
  select j.owner_id, j.title into v_owner, v_title from public.jobs j where j.id = new.job_id;
  if v_owner is null or v_owner = new.applicant_id then return new; end if;
  select username into v_actor from public.users where id = new.applicant_id;
  insert into public.notifications (user_id, type, title, body)
  values (v_owner, 'application', 'New applicant', '@' || coalesce(v_actor, 'someone') || ' applied to "' || v_title || '"');
  return new;
end; $$;

drop trigger if exists job_applications_notify on public.job_applications;
create trigger job_applications_notify after insert on public.job_applications
  for each row execute function public.notify_on_application();

create or replace function public.notify_on_bid()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_actor text;
begin
  select o.owner_id, o.title into v_owner, v_title from public.orders o where o.id = new.order_id;
  if v_owner is null or v_owner = new.bidder_id then return new; end if;
  select username into v_actor from public.users where id = new.bidder_id;
  insert into public.notifications (user_id, type, title, body)
  values (v_owner, 'bid', 'New bid', '@' || coalesce(v_actor, 'someone') || ' bid on "' || v_title || '"');
  return new;
end; $$;

drop trigger if exists order_bids_notify on public.order_bids;
create trigger order_bids_notify after insert on public.order_bids
  for each row execute function public.notify_on_bid();


-- ── 7. admin control panel ───────────────────────────────────────────────────
drop policy if exists "admins read all users" on public.users;
create policy "admins read all users" on public.users for select
  to authenticated using (public.is_admin());

drop policy if exists "admins read all repositories" on public.repositories;
create policy "admins read all repositories" on public.repositories for select
  to authenticated using (public.is_admin());

drop policy if exists "admins read all jobs" on public.jobs;
create policy "admins read all jobs" on public.jobs for select
  to authenticated using (public.is_admin());

drop policy if exists "admins read all orders" on public.orders;
create policy "admins read all orders" on public.orders for select
  to authenticated using (public.is_admin());

create or replace function public.admin_set_reputation(target uuid, value integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.users set reputation = greatest(0, value) where id = target;
end; $$;

grant execute on function public.admin_set_reputation(uuid, integer) to authenticated;

-- Ensure the platform owner is an admin (safe to re-run).
insert into public.user_roles (user_id, role)
select u.id, 'admin'::public.app_role
from public.users u
join auth.users au on au.id = u.id
where au.email = 'admin@vydex.dev'
on conflict (user_id, role) do nothing;


-- ═════════════════════════════════════════════════════════════════════════════
-- Done. Verify the feature tables exist:
--   select 'follows', count(*) from public.follows
--   union all select 'repository_versions', count(*) from public.repository_versions
--   union all select 'job_applications', count(*) from public.job_applications
--   union all select 'order_bids', count(*) from public.order_bids;
-- ═════════════════════════════════════════════════════════════════════════════
