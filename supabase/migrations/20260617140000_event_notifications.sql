-- Create notifications for the repository owner on key events.
-- SECURITY DEFINER so the triggers can insert into notifications regardless of
-- the acting user's grants. Never notify yourself about your own action.

-- ─── Likes (reactions) ───────────────────────────────────────────────────────
create or replace function public.notify_on_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_actor text;
begin
  select r.owner_id, r.title into v_owner, v_title
  from public.repositories r where r.id = new.repository_id;
  if v_owner is null or v_owner = new.user_id then return new; end if;
  select username into v_actor from public.users where id = new.user_id;
  insert into public.notifications (user_id, type, title, body)
  values (v_owner, 'like', 'New like',
          '@' || coalesce(v_actor, 'someone') || ' liked "' || v_title || '"');
  return new;
end; $$;

drop trigger if exists reactions_notify on public.reactions;
create trigger reactions_notify
  after insert on public.reactions
  for each row execute function public.notify_on_reaction();

-- ─── Forks ───────────────────────────────────────────────────────────────────
create or replace function public.notify_on_fork()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_actor text;
begin
  select r.owner_id, r.title into v_owner, v_title
  from public.repositories r where r.id = new.original_repository_id;
  if v_owner is null or v_owner = new.forked_by then return new; end if;
  select username into v_actor from public.users where id = new.forked_by;
  insert into public.notifications (user_id, type, title, body)
  values (v_owner, 'fork', 'New fork',
          '@' || coalesce(v_actor, 'someone') || ' forked "' || v_title || '"');
  return new;
end; $$;

drop trigger if exists forks_notify on public.forks;
create trigger forks_notify
  after insert on public.forks
  for each row execute function public.notify_on_fork();

-- ─── Reviews ─────────────────────────────────────────────────────────────────
create or replace function public.notify_on_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_actor text;
begin
  select r.owner_id, r.title into v_owner, v_title
  from public.repositories r where r.id = new.repository_id;
  if v_owner is null or v_owner = new.reviewer_id then return new; end if;
  select username into v_actor from public.users where id = new.reviewer_id;
  insert into public.notifications (user_id, type, title, body)
  values (v_owner, 'review', 'New review',
          '@' || coalesce(v_actor, 'someone') || ' reviewed "' || v_title || '"');
  return new;
end; $$;

drop trigger if exists reviews_notify on public.reviews;
create trigger reviews_notify
  after insert on public.reviews
  for each row execute function public.notify_on_review();

-- Purchases: a notify_on_purchase trigger will be added with the Stripe flow.
