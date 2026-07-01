-- Concurrency hardening for order money RPCs. IDEMPOTENT.
--
-- The accept/release/refund functions checked order state and then moved money
-- WITHOUT locking the order row, so two concurrent calls (double-click, two
-- tabs, owner+staff at once) could both pass the check and double-credit or
-- double-debit. Every state check now happens under `select … for update` on
-- the order row, which serializes competing calls; the loser re-reads the new
-- state and fails cleanly. auto_release_due_orders uses FOR UPDATE SKIP LOCKED
-- so the cron never fights a manual release.

-- ── accept a bid (lock, then re-check status='open') ────────────────────────
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
  v_exec   record;
  v_cents  integer;
  v_fee    integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select b.id, b.order_id, b.bidder_id, b.amount
    into v_bid
  from public.order_bids b
  where b.id = p_bid_id;
  if not found then raise exception 'Bid not found'; end if;

  -- Row lock: a concurrent accept of another bid waits here, then sees the
  -- status change and aborts instead of double-charging.
  select o.id, o.owner_id, o.status into v_order
  from public.orders o where o.id = v_bid.order_id
  for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.owner_id <> v_uid then raise exception 'Not your order'; end if;
  if v_order.status <> 'open' then raise exception 'Order is not open'; end if;
  if v_bid.bidder_id = v_uid then raise exception 'You cannot accept your own bid'; end if;

  v_cents := round(v_bid.amount * 100)::int;

  -- Fee waiver, mirrored from the repo-sale checkout, keyed on the executor.
  select early_adopter, created_at into v_exec from public.users where id = v_bid.bidder_id;
  v_fee := case
    when coalesce(v_exec.early_adopter, false)
      or (v_exec.created_at is not null and now() - v_exec.created_at < interval '30 days')
    then 0
    else round(v_cents * 0.10)::int
  end;

  perform public.post_ledger(v_uid, -v_cents, 'purchase', v_order.id, 'Order escrow');

  update public.orders
     set status = 'in_progress',
         escrow_status = 'held',
         executor_id = v_bid.bidder_id,
         assigned_bid_id = v_bid.id,
         amount_held_cents = v_cents,
         platform_fee_cents = v_fee
   where id = v_order.id;

  insert into public.notifications (user_id, type, title, body, actor_id, link)
  values (v_bid.bidder_id, 'bid', 'Your bid was accepted',
          'An order owner accepted your bid — funds are in escrow. Time to build!', v_uid,
          '/orders/' || v_order.id);

  return v_order.id;
end;
$$;

-- ── release (lock before paying the executor) ───────────────────────────────
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
  from public.orders where id = p_order_id
  for update;
  if not found then raise exception 'Order not found'; end if;
  if v_o.owner_id <> v_uid and not public.is_staff() then raise exception 'Not authorized'; end if;
  if v_o.escrow_status <> 'held' then raise exception 'Nothing in escrow to release'; end if;
  if v_o.executor_id is null then raise exception 'No executor assigned'; end if;

  v_net := coalesce(v_o.amount_held_cents, 0) - coalesce(v_o.platform_fee_cents, 0);
  perform public.post_ledger(v_o.executor_id, v_net, 'sale', p_order_id, 'Order payout');

  update public.orders set escrow_status = 'released', status = 'completed' where id = p_order_id;

  insert into public.notifications (user_id, type, title, body, actor_id, link)
  values (v_o.executor_id, 'payout', 'Order payment released',
          'Your delivered order was approved — the payment is on your balance.', v_uid,
          '/orders/' || p_order_id);
end;
$$;

-- ── refund (lock before returning the escrow) ───────────────────────────────
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
  from public.orders where id = p_order_id
  for update;
  if not found then raise exception 'Order not found'; end if;
  if v_o.escrow_status <> 'held' then raise exception 'Nothing in escrow to refund'; end if;
  if not v_staff and (v_o.owner_id <> v_uid or v_o.status <> 'in_progress') then
    raise exception 'Not authorized';
  end if;

  perform public.post_ledger(v_o.owner_id, coalesce(v_o.amount_held_cents, 0), 'refund', p_order_id, 'Order refund');

  update public.orders set escrow_status = 'refunded', status = 'cancelled' where id = p_order_id;

  if v_o.executor_id is not null then
    insert into public.notifications (user_id, type, title, body, actor_id, link)
    values (v_o.executor_id, 'bid', 'Order cancelled',
            'An order you were assigned to was cancelled and refunded.', v_uid,
            '/orders/' || p_order_id);
  end if;
end;
$$;

-- ── cron auto-release (skip rows a manual release is already holding) ───────
create or replace function public.auto_release_due_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r   record;
  n   integer := 0;
  net integer;
begin
  for r in
    select id, executor_id, amount_held_cents, platform_fee_cents
    from public.orders
    where status = 'review' and escrow_status = 'held'
      and auto_release_at is not null and auto_release_at <= now()
      and executor_id is not null
    for update skip locked
  loop
    net := coalesce(r.amount_held_cents, 0) - coalesce(r.platform_fee_cents, 0);
    perform public.post_ledger(r.executor_id, net, 'sale', r.id, 'Order auto-released');
    update public.orders set status = 'completed', escrow_status = 'released' where id = r.id;
    insert into public.notifications (user_id, type, title, body, link)
    values (r.executor_id, 'payout', 'Order auto-completed',
            'An order cleared the review window — the payment is on your balance.', '/orders/' || r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Keep this cron/service-only (mirrors 20260628130000).
revoke execute on function public.auto_release_due_orders() from public, anon, authenticated;
grant  execute on function public.auto_release_due_orders() to service_role;
