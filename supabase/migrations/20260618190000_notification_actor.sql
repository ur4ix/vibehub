-- Make notifications actionable: store who triggered each one, so clicking a
-- notification can open a chat with that person. IDEMPOTENT.

alter table public.notifications add column if not exists actor_username text;

-- ─── recreate notify triggers to also record the actor ───────────────────────
create or replace function public.notify_on_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_actor text;
begin
  select r.owner_id, r.title into v_owner, v_title from public.repositories r where r.id = new.repository_id;
  if v_owner is null or v_owner = new.user_id then return new; end if;
  select username into v_actor from public.users where id = new.user_id;
  insert into public.notifications (user_id, type, title, body, actor_username)
  values (v_owner, 'like', 'New like', '@' || coalesce(v_actor, 'someone') || ' liked "' || v_title || '"', v_actor);
  return new;
end; $$;

create or replace function public.notify_on_fork()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_actor text;
begin
  select r.owner_id, r.title into v_owner, v_title from public.repositories r where r.id = new.original_repository_id;
  if v_owner is null or v_owner = new.forked_by then return new; end if;
  select username into v_actor from public.users where id = new.forked_by;
  insert into public.notifications (user_id, type, title, body, actor_username)
  values (v_owner, 'fork', 'New fork', '@' || coalesce(v_actor, 'someone') || ' forked "' || v_title || '"', v_actor);
  return new;
end; $$;

create or replace function public.notify_on_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_actor text;
begin
  select r.owner_id, r.title into v_owner, v_title from public.repositories r where r.id = new.repository_id;
  if v_owner is null or v_owner = new.reviewer_id then return new; end if;
  select username into v_actor from public.users where id = new.reviewer_id;
  insert into public.notifications (user_id, type, title, body, actor_username)
  values (v_owner, 'review', 'New review', '@' || coalesce(v_actor, 'someone') || ' reviewed "' || v_title || '"', v_actor);
  return new;
end; $$;

create or replace function public.notify_on_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_actor text;
begin
  select j.owner_id, j.title into v_owner, v_title from public.jobs j where j.id = new.job_id;
  if v_owner is null or v_owner = new.applicant_id then return new; end if;
  select username into v_actor from public.users where id = new.applicant_id;
  insert into public.notifications (user_id, type, title, body, actor_username)
  values (v_owner, 'application', 'New applicant', '@' || coalesce(v_actor, 'someone') || ' applied to "' || v_title || '"', v_actor);
  return new;
end; $$;

create or replace function public.notify_on_bid()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_actor text;
begin
  select o.owner_id, o.title into v_owner, v_title from public.orders o where o.id = new.order_id;
  if v_owner is null or v_owner = new.bidder_id then return new; end if;
  select username into v_actor from public.users where id = new.bidder_id;
  insert into public.notifications (user_id, type, title, body, actor_username)
  values (v_owner, 'bid', 'New bid', '@' || coalesce(v_actor, 'someone') || ' bid on "' || v_title || '"', v_actor);
  return new;
end; $$;

create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor text;
begin
  select username into v_actor from public.users where id = new.follower_id;
  insert into public.notifications (user_id, type, title, body, actor_username)
  values (new.following_id, 'follow', 'New follower',
          '@' || coalesce(v_actor, 'someone') || ' started following you', v_actor);
  return new;
end; $$;

create or replace function public.notify_on_interest()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_name text; v_actor text;
begin
  select s.owner_id, s.name into v_owner, v_name from public.startups s where s.id = new.startup_id;
  if v_owner is null or v_owner = new.investor_id then return new; end if;
  select username into v_actor from public.users where id = new.investor_id;
  insert into public.notifications (user_id, type, title, body, actor_username)
  values (v_owner, 'interest', 'New interest',
          '@' || coalesce(v_actor, 'someone') || ' is interested in "' || v_name || '"', v_actor);
  return new;
end; $$;
