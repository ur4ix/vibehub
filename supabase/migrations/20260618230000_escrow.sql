-- Escrow on paid purchases. Payment grants access immediately (so the buyer can
-- verify), but the seller payout is "held" until the buyer confirms or an
-- auto-release deadline passes. Disputes go to staff (moderators). IDEMPOTENT.
--
-- escrow_status: held → released | disputed | refunded. Access stays gated on
-- status='completed' (unchanged); escrow_status only governs the seller payout.

alter table public.purchases
  add column if not exists escrow_status text
    check (escrow_status is null or escrow_status in ('held', 'released', 'disputed', 'refunded')),
  add column if not exists release_at timestamptz;

-- Buyers may only change escrow_status (confirm → released, raise → disputed).
grant update (escrow_status) on public.purchases to authenticated;

drop policy if exists "buyer manages own escrow" on public.purchases;
create policy "buyer manages own escrow"
  on public.purchases for update
  to authenticated
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id and escrow_status in ('released', 'disputed'));

-- Staff (admin/moderator) resolve disputes → any escrow_status.
drop policy if exists "staff manage escrow" on public.purchases;
create policy "staff manage escrow"
  on public.purchases for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());
