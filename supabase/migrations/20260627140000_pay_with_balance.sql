-- Pay for a paid repository from the internal balance. IDEMPOTENT.
--
-- Debits the buyer's balance and creates a completed purchase straight into
-- escrow (held, 3-day auto-release) — same downstream flow as a crypto buy, so
-- the seller is credited on release by credit_seller_on_release(). The platform
-- fee is computed with the same waiver rules as the crypto checkout.
create or replace function public.purchase_with_balance(p_repository_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_repo       record;
  v_seller     record;
  v_price      integer;
  v_fee        integer;
  v_existing   record;
  v_has_existing boolean;
  v_pid        uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select id, owner_id, type, price_cents, title
    into v_repo
  from public.repositories
  where id = p_repository_id;
  if not found then raise exception 'Repository not found'; end if;
  if v_repo.type <> 'paid' or coalesce(v_repo.price_cents, 0) <= 0 then
    raise exception 'Not a paid repository';
  end if;
  if v_repo.owner_id = v_uid then raise exception 'You own this repository'; end if;

  v_price := v_repo.price_cents;

  -- Reuse an existing purchase row if there is one.
  select id, status into v_existing
  from public.purchases
  where repository_id = p_repository_id and buyer_id = v_uid
  limit 1;
  v_has_existing := found;
  if v_has_existing and v_existing.status = 'completed' then
    return v_existing.id; -- already owned
  end if;

  -- Platform fee: Early Adopters and sellers in their first 30 days pay 0%.
  select created_at, early_adopter into v_seller
  from public.users where id = v_repo.owner_id;
  v_fee := case
    when coalesce(v_seller.early_adopter, false)
      or (v_seller.created_at is not null and now() - v_seller.created_at < interval '30 days')
    then 0
    else round(v_price * 0.10)::int
  end;

  -- Debit the buyer (raises 'Insufficient balance' and aborts if too low).
  perform public.post_ledger(v_uid, -v_price, 'purchase', p_repository_id,
                             'Purchase: ' || coalesce(v_repo.title, ''));

  if v_has_existing then
    update public.purchases
       set status = 'completed', completed_at = now(),
           escrow_status = 'held', release_at = now() + interval '3 days',
           amount_cents = v_price, platform_fee_cents = v_fee,
           seller_id = v_repo.owner_id, provider = 'balance'
     where id = v_existing.id
     returning id into v_pid;
  else
    insert into public.purchases (
      repository_id, buyer_id, seller_id, amount_cents, platform_fee_cents,
      status, completed_at, escrow_status, release_at, provider
    ) values (
      p_repository_id, v_uid, v_repo.owner_id, v_price, v_fee,
      'completed', now(), 'held', now() + interval '3 days', 'balance'
    )
    returning id into v_pid;
  end if;

  return v_pid;
end;
$$;

grant execute on function public.purchase_with_balance(uuid) to authenticated;
