-- Tip the executor of an order (owner → executor, no platform fee). IDEMPOTENT.
-- Allowed once the work is delivered (in review) or the order is completed.
create or replace function public.tip_order(p_order_id uuid, p_amount_cents integer)
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
  if coalesce(p_amount_cents, 0) <= 0 then raise exception 'Tip must be a positive amount'; end if;

  select owner_id, executor_id, status into v_o from public.orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
  if v_o.owner_id <> v_uid then raise exception 'Not your order'; end if;
  if v_o.executor_id is null then raise exception 'No executor to tip'; end if;
  if v_o.status not in ('review', 'completed') then raise exception 'You can tip after the work is delivered'; end if;

  -- Debit the owner (raises 'Insufficient balance' and aborts if too low),
  -- credit the executor the full amount — tips are fee-free.
  perform public.post_ledger(v_uid, -p_amount_cents, 'purchase', p_order_id, 'Tip to executor');
  perform public.post_ledger(v_o.executor_id, p_amount_cents, 'sale', p_order_id, 'Tip received');

  insert into public.notifications (user_id, type, title, body, actor_id, link)
  values (v_o.executor_id, 'payout', 'You got a tip',
          'The order owner sent you a tip — nice work!', v_uid, '/orders/' || p_order_id);
end;
$$;
grant execute on function public.tip_order(uuid, integer) to authenticated;
