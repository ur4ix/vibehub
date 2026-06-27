-- Balance funding (top-up) + cash-out (withdrawals). IDEMPOTENT.

-- ── Top-ups: buyer funds balance via a NOWPayments invoice ──────────────────
create table if not exists public.topups (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  status       text not null default 'pending' check (status in ('pending','credited','failed')),
  provider     text not null default 'nowpayments',
  provider_ref text,
  created_at   timestamptz not null default now()
);
alter table public.topups enable row level security;
drop policy if exists "read own topups" on public.topups;
create policy "read own topups" on public.topups for select to authenticated using (auth.uid() = user_id);
grant select on public.topups to authenticated; -- writes: service role only (API + webhook)

-- ── Withdrawals: seller cashes balance out to crypto ────────────────────────
create table if not exists public.withdrawals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  address      text not null,
  currency     text not null,
  status       text not null default 'pending' check (status in ('pending','sent','failed')),
  payout_ref   text,
  created_at   timestamptz not null default now()
);
create index if not exists withdrawals_status_idx on public.withdrawals (status, created_at);
alter table public.withdrawals enable row level security;
drop policy if exists "read own withdrawals" on public.withdrawals;
create policy "read own withdrawals" on public.withdrawals for select to authenticated using (auth.uid() = user_id);
drop policy if exists "admins read all withdrawals" on public.withdrawals;
create policy "admins read all withdrawals" on public.withdrawals for select to authenticated using (public.is_admin());
grant select on public.withdrawals to authenticated; -- writes: service role / RPC only

-- ── request_withdrawal: debit balance + create a pending withdrawal atomically ─
-- The actual crypto send is done by the API/admin (NOWPayments Payout). If it
-- ultimately fails, the admin "reject" path credits the balance back.
create or replace function public.request_withdrawal(p_amount_cents integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_u   record;
  v_id  uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if coalesce(p_amount_cents, 0) < 500 then
    raise exception 'Minimum withdrawal is $5.00';
  end if;

  select payout_address, payout_currency into v_u from public.users where id = v_uid;
  if v_u.payout_address is null or v_u.payout_currency is null then
    raise exception 'Set a payout wallet first';
  end if;

  -- Debit first (raises 'Insufficient balance' and aborts if too low).
  perform public.post_ledger(v_uid, -p_amount_cents, 'withdrawal', null, 'Withdrawal request');

  insert into public.withdrawals (user_id, amount_cents, address, currency)
  values (v_uid, p_amount_cents, v_u.payout_address, v_u.payout_currency)
  returning id into v_id;

  return v_id;
end;
$$;
grant execute on function public.request_withdrawal(integer) to authenticated;
