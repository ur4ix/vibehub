-- Fiverr-style delivery loop for orders. IDEMPOTENT.
--
-- Executor delivers (with a note) → order goes to 'review' with an auto-release
-- deadline. Owner either ACCEPTS (release_order, already exists) or REQUESTS A
-- REVISION (back to in_progress with feedback). If the owner does nothing before
-- auto_release_at, a cron auto-accepts so funds aren't stuck. Deliveries and
-- revision requests are stored as a timeline both parties can read.

alter table public.orders
  add column if not exists delivered_at    timestamptz,
  add column if not exists auto_release_at timestamptz,
  add column if not exists revisions_used  integer not null default 0;

create table if not exists public.order_deliveries (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  author_id  uuid not null references public.users (id) on delete cascade,
  kind       text not null check (kind in ('delivery','revision')),
  message    text not null,
  created_at timestamptz not null default now()
);
create index if not exists order_deliveries_order_idx on public.order_deliveries (order_id, created_at);

alter table public.order_deliveries enable row level security;
drop policy if exists "order parties read deliveries" on public.order_deliveries;
create policy "order parties read deliveries"
  on public.order_deliveries for select
  to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and (o.owner_id = auth.uid() or o.executor_id = auth.uid())
  ));
grant select on public.order_deliveries to authenticated; -- writes via RPC only

-- ── executor delivers the work → review (+ auto-release deadline) ───────────
create or replace function public.deliver_order(p_order_id uuid, p_message text)
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
  if coalesce(btrim(p_message), '') = '' then raise exception 'Add a delivery note'; end if;
  select owner_id, executor_id, status, escrow_status into v_o from public.orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
  if v_o.executor_id is distinct from v_uid then raise exception 'Not the assigned executor'; end if;
  if v_o.status <> 'in_progress' or v_o.escrow_status <> 'held' then raise exception 'Order is not in progress'; end if;

  insert into public.order_deliveries (order_id, author_id, kind, message)
  values (p_order_id, v_uid, 'delivery', btrim(p_message));

  update public.orders
     set status = 'review', delivered_at = now(), auto_release_at = now() + interval '3 days'
   where id = p_order_id;

  insert into public.notifications (user_id, type, title, body, actor_id)
  values (v_o.owner_id, 'bid', 'Order delivered',
          'Your order was delivered — review it, accept, or request a revision.', v_uid);
end;
$$;
grant execute on function public.deliver_order(uuid, text) to authenticated;

-- ── owner requests a revision → back to in_progress ─────────────────────────
create or replace function public.request_order_revision(p_order_id uuid, p_message text)
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
  if coalesce(btrim(p_message), '') = '' then raise exception 'Describe what needs changing'; end if;
  select owner_id, executor_id, status, escrow_status into v_o from public.orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
  if v_o.owner_id <> v_uid then raise exception 'Not your order'; end if;
  if v_o.status <> 'review' or v_o.escrow_status <> 'held' then raise exception 'Order is not awaiting review'; end if;

  insert into public.order_deliveries (order_id, author_id, kind, message)
  values (p_order_id, v_uid, 'revision', btrim(p_message));

  update public.orders
     set status = 'in_progress', revisions_used = revisions_used + 1,
         delivered_at = null, auto_release_at = null
   where id = p_order_id;

  insert into public.notifications (user_id, type, title, body, actor_id)
  values (v_o.executor_id, 'bid', 'Revision requested',
          'The owner requested changes on your delivery.', v_uid);
end;
$$;
grant execute on function public.request_order_revision(uuid, text) to authenticated;

-- ── cron: auto-accept deliveries the owner left past the deadline ───────────
-- SERVICE ROLE ONLY (not granted to clients).
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
  loop
    net := coalesce(r.amount_held_cents, 0) - coalesce(r.platform_fee_cents, 0);
    perform public.post_ledger(r.executor_id, net, 'sale', r.id, 'Order auto-released');
    update public.orders set status = 'completed', escrow_status = 'released' where id = r.id;
    insert into public.notifications (user_id, type, title, body)
    values (r.executor_id, 'payout', 'Order auto-completed',
            'An order cleared the review window — the payment is on your balance.');
    n := n + 1;
  end loop;
  return n;
end;
$$;
