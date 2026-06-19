-- Manually-assigned account badges (partner brands like Claude/OpenAI/Cursor,
-- plus specials like Founder/Verified). Earned/achievement badges are derived
-- on the fly from public stats and are NOT stored here. IDEMPOTENT.

create table if not exists public.account_badges (
  user_id    uuid not null references public.users on delete cascade,
  badge      text not null,
  granted_by uuid references public.users on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, badge)
);

create index if not exists account_badges_user_idx on public.account_badges (user_id);

alter table public.account_badges enable row level security;

drop policy if exists "badges are public" on public.account_badges;
create policy "badges are public"
  on public.account_badges for select
  using (true);

drop policy if exists "admins manage badges" on public.account_badges;
create policy "admins manage badges"
  on public.account_badges for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.account_badges to anon, authenticated;
grant insert, update, delete on public.account_badges to authenticated;
