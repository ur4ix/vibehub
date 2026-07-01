-- Buyers must never lose what they paid for. Previously staff (incl. admins who
-- are also sellers) could hard-delete a repo that had paid buyers, which removed
-- the row + storage file and stranded the buyer. Now a repo with paid, completed
-- purchases can't be hard-deleted by ANYONE — unpublish instead (buyers keep
-- access; the row and file stay). Malware removal should go through a dedicated
-- refund-and-remove flow, not the regular delete. IDEMPOTENT.
create or replace function public.prevent_sold_repo_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.purchases p
    where p.repository_id = old.id and p.status = 'completed' and p.amount_cents > 0
  ) then
    raise exception 'This repository has paid buyers and can''t be deleted. Unpublish it instead.'
      using errcode = 'restrict_violation';
  end if;
  return old;
end;
$$;
