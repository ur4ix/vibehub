-- Anti-abuse: per-user rate limits + server-side content filtering, enforced in
-- the database so they can't be bypassed by hitting the API directly. IDEMPOTENT.

-- ─── Rate limiting ───────────────────────────────────────────────────────────
-- Generic BEFORE INSERT guard: blocks a user from inserting more than `max` rows
-- into the trigger's table within `window` seconds. Args: (user_column, seconds,
-- max). SECURITY DEFINER so the count sees all rows regardless of RLS.
create or replace function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_col text := tg_argv[0];
  v_window   int  := tg_argv[1]::int;
  v_max      int  := tg_argv[2]::int;
  v_user     uuid;
  v_count    int;
begin
  v_user := (to_jsonb(new) ->> v_user_col)::uuid;
  if v_user is null then return new; end if;

  execute format(
    'select count(*) from public.%I where %I = $1 and created_at > now() - make_interval(secs => $2)',
    tg_table_name, v_user_col
  ) into v_count using v_user, v_window;

  if v_count >= v_max then
    raise exception 'Rate limit: too many recent actions. Please slow down and try again shortly.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Burst-y, free actions: per-minute caps.
drop trigger if exists messages_rl on public.messages;
create trigger messages_rl before insert on public.messages
  for each row execute function public.enforce_rate_limit('sender_id', '60', '20');

drop trigger if exists reactions_rl on public.reactions;
create trigger reactions_rl before insert on public.reactions
  for each row execute function public.enforce_rate_limit('user_id', '60', '30');

drop trigger if exists follows_rl on public.follows;
create trigger follows_rl before insert on public.follows
  for each row execute function public.enforce_rate_limit('follower_id', '60', '30');

-- Content/postings: per-hour caps (generous for real use, tight against spam).
drop trigger if exists repositories_rl on public.repositories;
create trigger repositories_rl before insert on public.repositories
  for each row execute function public.enforce_rate_limit('owner_id', '3600', '12');

drop trigger if exists jobs_rl on public.jobs;
create trigger jobs_rl before insert on public.jobs
  for each row execute function public.enforce_rate_limit('owner_id', '3600', '8');

drop trigger if exists orders_rl on public.orders;
create trigger orders_rl before insert on public.orders
  for each row execute function public.enforce_rate_limit('owner_id', '3600', '8');

drop trigger if exists startups_rl on public.startups;
create trigger startups_rl before insert on public.startups
  for each row execute function public.enforce_rate_limit('owner_id', '3600', '6');

drop trigger if exists posts_rl on public.posts;
create trigger posts_rl before insert on public.posts
  for each row execute function public.enforce_rate_limit('author_id', '3600', '12');

drop trigger if exists reviews_rl on public.reviews;
create trigger reviews_rl before insert on public.reviews
  for each row execute function public.enforce_rate_limit('reviewer_id', '3600', '20');

drop trigger if exists order_bids_rl on public.order_bids;
create trigger order_bids_rl before insert on public.order_bids
  for each row execute function public.enforce_rate_limit('bidder_id', '3600', '30');

drop trigger if exists job_applications_rl on public.job_applications;
create trigger job_applications_rl before insert on public.job_applications
  for each row execute function public.enforce_rate_limit('applicant_id', '3600', '30');

drop trigger if exists startup_interests_rl on public.startup_interests;
create trigger startup_interests_rl before insert on public.startup_interests
  for each row execute function public.enforce_rate_limit('investor_id', '3600', '30');

-- ─── Server-side banned-words on the remaining user content ──────────────────
-- (repositories/jobs/orders/applications/bids/reviews already have these; DMs,
-- startups and posts were client-only and bypassable.)
drop trigger if exists messages_bw on public.messages;
create trigger messages_bw before insert or update on public.messages
  for each row execute function public.bw_guard('body');

drop trigger if exists startups_bw on public.startups;
create trigger startups_bw before insert or update on public.startups
  for each row execute function public.bw_guard_with_tags('name', 'tagline', 'description');

drop trigger if exists posts_bw on public.posts;
create trigger posts_bw before insert or update on public.posts
  for each row execute function public.bw_guard('title', 'excerpt', 'body');

drop trigger if exists startup_interests_bw on public.startup_interests;
create trigger startup_interests_bw before insert or update on public.startup_interests
  for each row execute function public.bw_guard('message');
