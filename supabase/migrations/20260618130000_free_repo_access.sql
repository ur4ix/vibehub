-- Reviews require a completed purchase (validate_review trigger). Free repos
-- have no purchase, so nobody could review them. This SECURITY DEFINER function
-- mints a $0 "completed" purchase for FREE repos only (validated server-side, so
-- a client can't fake a purchase of a paid repo). Idempotent per buyer+repo.

create or replace function public.claim_free_repo(p_repository_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_repo record;
  v_purchase_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id, owner_id, type, is_published
    into v_repo
  from public.repositories
  where id = p_repository_id;

  if not found then raise exception 'Repository not found'; end if;
  if v_repo.owner_id = auth.uid() then
    raise exception 'You own this repository';
  end if;
  if v_repo.type <> 'free' or not v_repo.is_published then
    raise exception 'Not a free repository';
  end if;

  -- Already has an access/purchase record? return it.
  select id into v_purchase_id
  from public.purchases
  where repository_id = p_repository_id and buyer_id = auth.uid()
  limit 1;
  if v_purchase_id is not null then
    return v_purchase_id;
  end if;

  insert into public.purchases (repository_id, buyer_id, seller_id, amount_cents, status, completed_at)
  values (p_repository_id, auth.uid(), v_repo.owner_id, 0, 'completed', now())
  returning id into v_purchase_id;

  return v_purchase_id;
end;
$$;

grant execute on function public.claim_free_repo(uuid) to authenticated;
