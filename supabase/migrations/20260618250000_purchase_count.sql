-- Public sales counter on repositories (purchases are RLS-private, so we keep a
-- denormalized count that's safe to show to everyone). IDEMPOTENT.

alter table public.repositories
  add column if not exists purchase_count integer not null default 0;

create or replace function public.bump_purchase_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'completed' then
    update public.repositories set purchase_count = purchase_count + 1 where id = new.repository_id;
  elsif tg_op = 'UPDATE' and new.status = 'completed' and old.status is distinct from 'completed' then
    update public.repositories set purchase_count = purchase_count + 1 where id = new.repository_id;
  end if;
  return new;
end;
$$;

drop trigger if exists purchases_count on public.purchases;
create trigger purchases_count
  after insert or update on public.purchases
  for each row execute function public.bump_purchase_count();

-- Backfill from existing completed purchases.
update public.repositories r
  set purchase_count = (
    select count(*) from public.purchases p
    where p.repository_id = r.id and p.status = 'completed'
  );
