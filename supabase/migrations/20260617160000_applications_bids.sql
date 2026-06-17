-- Job applications + order bids.
-- The "Apply for this job" and "Place a bid" buttons need somewhere to write to;
-- jobs.applicants_count / orders.bids_count are kept in sync via triggers, and
-- the poster gets a notification on each new application/bid.

-- ─── Job applications ────────────────────────────────────────────────────────
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
create policy "applicants can apply to open jobs"
  on public.job_applications for insert
  to authenticated
  with check (
    auth.uid() = applicant_id
    and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open')
  );

drop policy if exists "applicants can read own applications" on public.job_applications;
create policy "applicants can read own applications"
  on public.job_applications for select
  to authenticated
  using (auth.uid() = applicant_id);

drop policy if exists "job owners can read applications" on public.job_applications;
create policy "job owners can read applications"
  on public.job_applications for select
  to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and j.owner_id = auth.uid()));

drop policy if exists "applicants can withdraw applications" on public.job_applications;
create policy "applicants can withdraw applications"
  on public.job_applications for delete
  to authenticated
  using (auth.uid() = applicant_id);

grant select, insert, delete on public.job_applications to authenticated;

-- ─── Order bids ──────────────────────────────────────────────────────────────
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
create policy "bidders can bid on open orders"
  on public.order_bids for insert
  to authenticated
  with check (
    auth.uid() = bidder_id
    and exists (select 1 from public.orders o where o.id = order_id and o.status = 'open')
  );

drop policy if exists "bidders can read own bids" on public.order_bids;
create policy "bidders can read own bids"
  on public.order_bids for select
  to authenticated
  using (auth.uid() = bidder_id);

drop policy if exists "order owners can read bids" on public.order_bids;
create policy "order owners can read bids"
  on public.order_bids for select
  to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.owner_id = auth.uid()));

drop policy if exists "bidders can withdraw bids" on public.order_bids;
create policy "bidders can withdraw bids"
  on public.order_bids for delete
  to authenticated
  using (auth.uid() = bidder_id);

grant select, insert, delete on public.order_bids to authenticated;

-- ─── Counter sync (SECURITY DEFINER: applicant/bidder may not update the post) ─
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
create trigger job_applications_count
  after insert or delete on public.job_applications
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
create trigger order_bids_count
  after insert or delete on public.order_bids
  for each row execute function public.sync_bids_count();

-- ─── Notify the poster ───────────────────────────────────────────────────────
create or replace function public.notify_on_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_actor text;
begin
  select j.owner_id, j.title into v_owner, v_title from public.jobs j where j.id = new.job_id;
  if v_owner is null or v_owner = new.applicant_id then return new; end if;
  select username into v_actor from public.users where id = new.applicant_id;
  insert into public.notifications (user_id, type, title, body)
  values (v_owner, 'application', 'New applicant',
          '@' || coalesce(v_actor, 'someone') || ' applied to "' || v_title || '"');
  return new;
end; $$;

drop trigger if exists job_applications_notify on public.job_applications;
create trigger job_applications_notify
  after insert on public.job_applications
  for each row execute function public.notify_on_application();

create or replace function public.notify_on_bid()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_actor text;
begin
  select o.owner_id, o.title into v_owner, v_title from public.orders o where o.id = new.order_id;
  if v_owner is null or v_owner = new.bidder_id then return new; end if;
  select username into v_actor from public.users where id = new.bidder_id;
  insert into public.notifications (user_id, type, title, body)
  values (v_owner, 'bid', 'New bid',
          '@' || coalesce(v_actor, 'someone') || ' bid on "' || v_title || '"');
  return new;
end; $$;

drop trigger if exists order_bids_notify on public.order_bids;
create trigger order_bids_notify
  after insert on public.order_bids
  for each row execute function public.notify_on_bid();
