-- Foundation for seller payouts. IDEMPOTENT.
--
-- A released escrow becomes a payout the platform owes the seller. We track the
-- seller's payout wallet and a per-purchase payout state so the money owed can
-- be listed (and later sent automatically via the NOWPayments Payout API).

-- 1) Seller payout wallet — PRIVATE. Not exposed by the public `profiles` view,
--    so it never leaks. NOWPayments addresses a payout by (currency, address),
--    e.g. currency 'usdttrc20'.
alter table public.users
  add column if not exists payout_address  text,
  add column if not exists payout_currency text;

grant update (payout_address, payout_currency) on public.users to authenticated;

-- 2) Per-purchase payout state. owed = escrow released & not yet paid.
alter table public.purchases
  add column if not exists payout_status text
    check (payout_status is null or payout_status in ('pending', 'paid')),
  add column if not exists payout_ref text,
  add column if not exists paid_at timestamptz;

-- 3) Lock down client writes to purchases: previously a table-wide UPDATE grant
--    let a buyer (who can already touch their own row to release escrow) also
--    set payout_status='paid' and rob the seller of a payout. Restrict clients
--    to escrow_status only; payout columns are written exclusively by the
--    service role (admin payouts), which bypasses these grants.
revoke update on public.purchases from authenticated;
grant update (escrow_status) on public.purchases to authenticated;

create index if not exists purchases_payout_idx
  on public.purchases (seller_id, escrow_status, payout_status);
