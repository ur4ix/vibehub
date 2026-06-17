-- Follow / subscribe to a user to track their publications.

create table public.follows (
  id           bigint generated always as identity primary key,
  follower_id  uuid not null references public.users (id) on delete cascade,
  following_id uuid not null references public.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint follows_unique unique (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);

create index follows_following_idx on public.follows (following_id);
create index follows_follower_idx  on public.follows (follower_id);

alter table public.follows enable row level security;

-- Public read (follower counts + follow state).
create policy "follows are readable" on public.follows for select using (true);

-- You can only create/remove your own follows.
create policy "users can follow" on public.follows for insert
  to authenticated with check (follower_id = auth.uid());
create policy "users can unfollow" on public.follows for delete
  to authenticated using (follower_id = auth.uid());

grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;

-- Notify the followed user.
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
create trigger follows_notify
  after insert on public.follows
  for each row execute function public.notify_on_follow();
