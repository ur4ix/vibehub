-- ─── Jobs (hiring posts) ─────────────────────────────────────────────────────

create table public.jobs (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.users on delete cascade,
  title           text not null,
  description     text not null,
  budget_type     text not null check (budget_type in ('fixed', 'equity', 'hourly')),
  budget_value    numeric not null,
  tags            text[] not null default '{}',
  status          text not null default 'open' check (status in ('open', 'closed')),
  applicants_count integer not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.jobs enable row level security;

create policy "anyone can read open jobs"
  on public.jobs for select
  using (status = 'open');

create policy "owners can manage own jobs"
  on public.jobs for all
  to authenticated
  using  (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

grant select         on public.jobs to anon;
grant select, insert, update, delete on public.jobs to authenticated;

-- ─── Orders ──────────────────────────────────────────────────────────────────

create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.users on delete cascade,
  title         text not null,
  description   text not null,
  budget        numeric not null,
  delivery_days integer,
  tags          text[] not null default '{}',
  status        text not null default 'open'
    check (status in ('open', 'in_progress', 'review', 'completed', 'cancelled')),
  bids_count    integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "anyone can read open orders"
  on public.orders for select
  using (status = 'open');

create policy "owners can manage own orders"
  on public.orders for all
  to authenticated
  using  (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

grant select         on public.orders to anon;
grant select, insert, update, delete on public.orders to authenticated;
