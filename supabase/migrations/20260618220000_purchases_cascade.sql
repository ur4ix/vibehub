-- Deleting a repository was blocked by purchases.repository_id ON DELETE
-- RESTRICT — including the $0 free-access records from claim_free_repo. Switch
-- to ON DELETE CASCADE so removing a repo also removes its purchases (reviews
-- already cascade from purchases). IDEMPOTENT.

alter table public.purchases drop constraint if exists purchases_repository_id_fkey;
alter table public.purchases
  add constraint purchases_repository_id_fkey
  foreign key (repository_id) references public.repositories (id) on delete cascade;
