-- Escrow for orders, paid from the internal balance. IDEMPOTENT.
--
-- Flow: owner accepts a bid → bid amount is debited from the owner's balance and
-- HELD; order goes in_progress with an assigned executor. Executor marks it
-- delivered (review). Owner approves → the held funds (net of platform fee) are
-- released to the executor's balance and the order completes. Owner (before
-- delivery) or staff can refund → the held amount returns to the owner's balance.
--
-- Order amounts are dollars (orders.budget / order_bids.amount are numeric); the
-- balance is in cents, so we convert with round(amount * 100).

alter table public.orders
  add column if not exists executor_id        uuid references public.users (id),
  add column if not exists assigned_bid_id    uuid references public.order_bids (id),
  add column if not exists escrow_status      text check (escrow_status is null or escrow_status in ('held','released','refunded','disputed')),
  add column if not exists amount_held_cents  integer,
  add column if not exists platform_fee_cents integer;

-- Once accepted, an order is no longer 'open', so the assigned executor needs an
-- explicit read path to keep seeing it (and act on it).
drop policy if exists "executors can read assigned orders" on public.orders;
create policy "executors can read assigned orders"
  on public.orders for select
  to authenticated
  using (executor_id = auth.uid());

-- ── accept a bid → debit owner, hold funds, assign executor ─────────────────
create or replace function public.accept_order_bid(p_bid_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_bid    record;
  v_order  record;
  v_cents  integer;
  v_fee    integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select b.id, b.order_id, b.bidder_id, b.amount
    into v_bid
  from public.order_bids b
  where b.id = p_bid_id;
  if not found then raise exception 'Bid not found'; end if;

  select o.id, o.owner_id, o.status into v_order
  from public.orders o where o.id = v_bid.order_id;
  if not found then raise exception 'Order not found'; end if;
  if v_order.owner_id <> v_uid then raise exception 'Not your order'; end if;
  if v_order.status <> 'open' then raise exception 'Order is not open'; end if;
  if v_bid.bidder_id = v_uid then raise exception 'You cannot accept your own bid'; end if;

  v_cents := round(v_bid.amount * 100)::int;
  v_fee   := round(v_cents * 0.10)::int;

  -- Debit the owner into escrow (raises 'Insufficient balance' and aborts if low).
  perform public.post_ledger(v_uid, -v_cents, 'purchase', v_order.id, 'Order escrow');

  update public.orders
     set status = 'in_progress',
         escrow_status = 'held',
         executor_id = v_bid.bidder_id,
         assigned_bid_id = v_bid.id,
         amount_held_cents = v_cents,
         platform_fee_cents = v_fee
   where id = v_order.id;

  insert into public.notifications (user_id, type, title, body, actor_id)
  values (v_bid.bidder_id, 'bid', 'Your bid was accepted',
          'An order owner accepted your bid — funds are in escrow. Time to build!', v_uid);

  return v_order.id;
end;
$$;
grant execute on function public.accept_order_bid(uuid) to authenticated;

-- ── executor marks the order delivered → review ─────────────────────────────
create or replace function public.mark_order_delivered(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_o   record;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select owner_id, executor_id, status, escrow_status into v_o
  from public.orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
  if v_o.executor_id is distinct from v_uid then raise exception 'Not the assigned executor'; end if;
  if v_o.status <> 'in_progress' or v_o.escrow_status <> 'held' then
    raise exception 'Order is not in progress';
  end if;

  update public.orders set status = 'review' where id = p_order_id;

  insert into public.notifications (user_id, type, title, body, actor_id)
  values (v_o.owner_id, 'bid', 'Order delivered',
          'The executor marked your order as delivered — review and release the payment.', v_uid);
end;
$$;
grant execute on function public.mark_order_delivered(uuid) to authenticated;

-- ── owner (or staff) approves → release held funds to the executor ──────────
create or replace function public.release_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_o   record;
  v_net integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select owner_id, executor_id, status, escrow_status, amount_held_cents, platform_fee_cents
    into v_o
  from public.orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
  if v_o.owner_id <> v_uid and not public.is_staff() then raise exception 'Not authorized'; end if;
  if v_o.escrow_status <> 'held' then raise exception 'Nothing in escrow to release'; end if;
  if v_o.executor_id is null then raise exception 'No executor assigned'; end if;

  v_net := coalesce(v_o.amount_held_cents, 0) - coalesce(v_o.platform_fee_cents, 0);
  perform public.post_ledger(v_o.executor_id, v_net, 'sale', p_order_id, 'Order payout');

  update public.orders set escrow_status = 'released', status = 'completed' where id = p_order_id;

  insert into public.notifications (user_id, type, title, body, actor_id)
  values (v_o.executor_id, 'payout', 'Order payment released',
          'Your delivered order was approved — the payment is on your balance.', v_uid);
end;
$$;
grant execute on function public.release_order(uuid) to authenticated;

-- ── owner (before delivery) or staff refunds → held funds back to the owner ──
create or replace function public.refund_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_o     record;
  v_staff boolean := public.is_staff();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select owner_id, executor_id, status, escrow_status, amount_held_cents into v_o
  from public.orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
  if v_o.escrow_status <> 'held' then raise exception 'Nothing in escrow to refund'; end if;
  -- owner may cancel only before the work is submitted for review; staff anytime.
  if not v_staff and (v_o.owner_id <> v_uid or v_o.status <> 'in_progress') then
    raise exception 'Not authorized';
  end if;

  perform public.post_ledger(v_o.owner_id, coalesce(v_o.amount_held_cents, 0), 'refund', p_order_id, 'Order refund');

  update public.orders set escrow_status = 'refunded', status = 'cancelled' where id = p_order_id;

  if v_o.executor_id is not null then
    insert into public.notifications (user_id, type, title, body, actor_id)
    values (v_o.executor_id, 'bid', 'Order cancelled',
            'An order you were assigned to was cancelled and refunded.', v_uid);
  end if;
end;
$$;
grant execute on function public.refund_order(uuid) to authenticated;
