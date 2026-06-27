-- Internal balance — Phase 1: ledger + cached balance + seller earnings credit.
-- IDEMPOTENT.
--
-- Earnings model: when a sale clears escrow (escrow_status → 'released'), the
-- seller's NET (price − platform fee) is credited to their internal balance via
-- an append-only ledger. The per-sale crypto auto-payout is superseded — the
-- released row is marked payout_status='paid' (ref 'balance') so the payout
-- engine skips it; cashing the balance out to crypto comes in Phase 2.
--
-- Integrity rules:
--   • balance_entries is append-only (no client insert/update/delete).
--   • users.balance_cents is mutated ONLY by post_ledger() (SECURITY DEFINER,
--     row-locked); clients have no UPDATE grant on it.
--   • a debit can never drive the balance below zero.

-- ── cached balance on the user ──────────────────────────────────────────────
alter table public.users
  add column if not exists balance_cents integer not null default 0;
-- NOTE: not added to the public `profiles` view → never leaks. No client UPDATE
-- grant on balance_cents (users updates are column-scoped), so only the
-- definer function below can change it.

-- ── append-only ledger ──────────────────────────────────────────────────────
create table if not exists public.balance_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  amount_cents integer not null,                 -- signed: + credit / − debit
  type        text not null check (type in ('topup','purchase','sale','withdrawal','refund','fee','adjustment')),
  ref_id      uuid,                              -- related purchase / withdrawal
  memo        text,
  created_at  timestamptz not null default now()
);

create index if not exists balance_entries_user_idx
  on public.balance_entries (user_id, created_at desc);

alter table public.balance_entries enable row level security;

drop policy if exists "read own ledger" on public.balance_entries;
create policy "read own ledger"
  on public.balance_entries for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "admins read all ledger" on public.balance_entries;
create policy "admins read all ledger"
  on public.balance_entries for select
  to authenticated
  using (public.is_admin());

-- Read-only for clients; all writes go through post_ledger() (definer).
grant select on public.balance_entries to authenticated;

-- ── post_ledger: the ONLY writer of balances ────────────────────────────────
-- Inserts a ledger row and moves the cached balance atomically under a row lock.
-- SECURITY DEFINER and intentionally NOT granted to clients — it is called by
-- triggers / the service role only.
create or replace function public.post_ledger(
  p_user   uuid,
  p_amount integer,
  p_type   text,
  p_ref    uuid default null,
  p_memo   text default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  -- lock the user row so concurrent moves can't race
  perform 1 from public.users where id = p_user for update;

  insert into public.balance_entries (user_id, amount_cents, type, ref_id, memo)
  values (p_user, p_amount, p_type, p_ref, p_memo);

  update public.users
     set balance_cents = balance_cents + p_amount
   where id = p_user
   returning balance_cents into v_balance;

  if v_balance < 0 then
    raise exception 'Insufficient balance' using errcode = 'check_violation';
  end if;

  return v_balance;
end;
$$;

-- ── credit the seller when a sale clears escrow ─────────────────────────────
create or replace function public.credit_seller_on_release()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_net integer;
begin
  -- only on the transition INTO 'released', for a real (paid) sale not yet settled
  if NEW.escrow_status = 'released'
     and OLD.escrow_status is distinct from 'released'
     and coalesce(NEW.amount_cents, 0) > 0
     and NEW.payout_status is distinct from 'paid' then

    v_net := NEW.amount_cents - coalesce(NEW.platform_fee_cents, 0);
    perform public.post_ledger(NEW.seller_id, v_net, 'sale', NEW.id, 'Sale cleared escrow');

    -- settle to balance; the crypto payout engine skips 'paid' rows.
    NEW.payout_status := 'paid';
    NEW.payout_ref    := 'balance';
    NEW.paid_at       := now();
  end if;

  return NEW;
end;
$$;

drop trigger if exists purchases_credit_on_release on public.purchases;
create trigger purchases_credit_on_release
  before update on public.purchases
  for each row execute function public.credit_seller_on_release();
