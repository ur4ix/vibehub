-- Protect buyers: a seller must not be able to make a purchased repo disappear.
-- IDEMPOTENT.

-- 1) Buyers can read a repository they purchased even if it's later unpublished,
--    so it stays visible in their library and remains downloadable.
drop policy if exists "buyers can read purchased repositories" on public.repositories;
create policy "buyers can read purchased repositories"
  on public.repositories for select
  to authenticated
  using (exists (
    select 1 from public.purchases p
    where p.repository_id = id and p.buyer_id = auth.uid() and p.status = 'completed'
  ));

-- 2) A repo with PAID, completed purchases can't be hard-deleted by the owner
--    (would yank access + history). Staff can still remove it (e.g. malware) and
--    handle refunds separately.
create or replace function public.prevent_sold_repo_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() and exists (
    select 1 from public.purchases p
    where p.repository_id = old.id and p.status = 'completed' and p.amount_cents > 0
  ) then
    raise exception 'This repository has paid buyers and can''t be deleted. Unpublish it instead.'
      using errcode = 'restrict_violation';
  end if;
  return old;
end;
$$;

drop trigger if exists repositories_prevent_sold_delete on public.repositories;
create trigger repositories_prevent_sold_delete
  before delete on public.repositories
  for each row execute function public.prevent_sold_repo_delete();
