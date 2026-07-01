-- Order UX: deep-link notifications + protect escrowed orders from deletion.
-- IDEMPOTENT.

-- ── #7: notifications can carry a deep link; "New bid" points at the order ───
alter table public.notifications add column if not exists link text;

create or replace function public.notify_on_bid()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_actor text;
begin
  select o.owner_id, o.title into v_owner, v_title from public.orders o where o.id = new.order_id;
  if v_owner is null or v_owner = new.bidder_id then return new; end if;
  select username into v_actor from public.users where id = new.bidder_id;
  insert into public.notifications (user_id, type, title, body, actor_username, actor_id, link)
  values (v_owner, 'bid', 'New bid', 'bid on "' || v_title || '"', v_actor, new.bidder_id,
          '/orders/' || new.order_id);
  return new;
end; $$;

-- ── #6: never hard-delete an order while its escrow still holds funds ────────
-- The owner's balance was debited into escrow when they accepted a bid; deleting
-- the row would strand that money. They must Cancel & refund first.
create or replace function public.prevent_escrow_order_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.escrow_status = 'held' then
    raise exception 'Cancel & refund this order before deleting it — funds are still in escrow.'
      using errcode = 'restrict_violation';
  end if;
  return old;
end; $$;

drop trigger if exists orders_prevent_escrow_delete on public.orders;
create trigger orders_prevent_escrow_delete
  before delete on public.orders
  for each row execute function public.prevent_escrow_order_delete();
