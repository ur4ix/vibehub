-- Startup interest: an investor/partner taps "Express interest" and the founder
-- gets a notification (mirrors job_applications / order_bids). IDEMPOTENT.

create table if not exists public.startup_interests (
  id          uuid primary key default gen_random_uuid(),
  startup_id  uuid not null references public.startups on delete cascade,
  investor_id uuid not null references public.users    on delete cascade,
  message     text,
  created_at  timestamptz not null default now(),
  unique (startup_id, investor_id)
);

create index if not exists startup_interests_startup_idx on public.startup_interests (startup_id);

alter table public.startup_interests enable row level security;

drop policy if exists "investors can express interest" on public.startup_interests;
create policy "investors can express interest"
  on public.startup_interests for insert
  to authenticated
  with check (auth.uid() = investor_id);

drop policy if exists "investors can read own interest" on public.startup_interests;
create policy "investors can read own interest"
  on public.startup_interests for select
  to authenticated
  using (auth.uid() = investor_id);

drop policy if exists "founders can read interest" on public.startup_interests;
create policy "founders can read interest"
  on public.startup_interests for select
  to authenticated
  using (exists (select 1 from public.startups s where s.id = startup_id and s.owner_id = auth.uid()));

drop policy if exists "investors can withdraw interest" on public.startup_interests;
create policy "investors can withdraw interest"
  on public.startup_interests for delete
  to authenticated
  using (auth.uid() = investor_id);

grant select, insert, delete on public.startup_interests to authenticated;

-- ─── notify the founder ──────────────────────────────────────────────────────
create or replace function public.notify_on_interest()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_name text; v_actor text;
begin
  select s.owner_id, s.name into v_owner, v_name from public.startups s where s.id = new.startup_id;
  if v_owner is null or v_owner = new.investor_id then return new; end if;
  select username into v_actor from public.users where id = new.investor_id;
  insert into public.notifications (user_id, type, title, body)
  values (v_owner, 'interest', 'New interest',
          '@' || coalesce(v_actor, 'someone') || ' is interested in "' || v_name || '"');
  return new;
end; $$;

drop trigger if exists startup_interests_notify on public.startup_interests;
create trigger startup_interests_notify after insert on public.startup_interests
  for each row execute function public.notify_on_interest();

-- ─── banned-word guard (optional message) ────────────────────────────────────
do $$ begin
  drop trigger if exists startup_interests_bw on public.startup_interests;
  create trigger startup_interests_bw before insert or update on public.startup_interests
    for each row execute function public.bw_guard('message');
exception when undefined_function then
  raise notice 'bw_guard not found — run 20260617180000_banned_words.sql first';
end $$;
