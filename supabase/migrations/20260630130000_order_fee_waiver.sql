-- Orders now apply the SAME platform-fee waiver as repo sales, so earnings are
-- consistent: Early Adopters pay 0% forever, everyone else 0% for their first
-- 30 days then 10%. The waiver is based on the EXECUTOR (the one earning).
-- IDEMPOTENT.
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

  select o.id, o.owner_id, o.status into v_order
  from public.orders o where o.id = v_bid.order_id;
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
