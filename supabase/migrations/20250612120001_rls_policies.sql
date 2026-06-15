-- Row Level Security policies for Vydex

alter table public.users enable row level security;
alter table public.repositories enable row level security;
alter table public.listings enable row level security;
alter table public.purchases enable row level security;
alter table public.forks enable row level security;
alter table public.reviews enable row level security;
alter table public.reactions enable row level security;
alter table public.chats enable row level security;

-- ---------------------------------------------------------------------------
-- users
--
-- Приватные поля (Stripe IDs, депозит продавца) видны только владельцу.
-- Публичная часть профиля доступна всем через view public.profiles.
-- ---------------------------------------------------------------------------

create policy "users can read own row"
  on public.users
  for select
  to authenticated
  using (auth.uid() = id);

create policy "users can update own profile"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- security definer (поведение view по умолчанию): обходит RLS на users,
-- наружу отдаёт только безопасные колонки
create view public.profiles as
select
  id,
  username,
  display_name,
  avatar_url,
  bio,
  reputation,
  created_at
from public.users;

-- ---------------------------------------------------------------------------
-- repositories
-- ---------------------------------------------------------------------------

create policy "published repositories are publicly readable"
  on public.repositories
  for select
  using (is_published = true or auth.uid() = owner_id);

create policy "owners can insert repositories"
  on public.repositories
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "owners can update own repositories"
  on public.repositories
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "owners can delete own repositories"
  on public.repositories
  for delete
  to authenticated
  using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------

create policy "listings are readable when active or owned"
  on public.listings
  for select
  using (
    status = 'active'
    or auth.uid() = seller_id
    or exists (
      select 1
      from public.repositories r
      where r.id = repository_id
        and r.is_published = true
    )
  );

create policy "sellers can manage own listings"
  on public.listings
  for all
  to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

-- ---------------------------------------------------------------------------
-- purchases
-- ---------------------------------------------------------------------------

create policy "buyers and sellers can read own purchases"
  on public.purchases
  for select
  to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "buyers can create purchases"
  on public.purchases
  for insert
  to authenticated
  with check (auth.uid() = buyer_id);

create policy "participants can update own purchases"
  on public.purchases
  for update
  to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id)
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

-- ---------------------------------------------------------------------------
-- forks
-- ---------------------------------------------------------------------------

create policy "forks are publicly readable"
  on public.forks
  for select
  using (true);

create policy "users can record own forks"
  on public.forks
  for insert
  to authenticated
  with check (auth.uid() = forked_by);

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

create policy "reviews are publicly readable"
  on public.reviews
  for select
  using (true);

create policy "buyers can create reviews for completed purchases"
  on public.reviews
  for insert
  to authenticated
  with check (
    auth.uid() = reviewer_id
    and exists (
      select 1
      from public.purchases p
      where p.id = purchase_id
        and p.buyer_id = auth.uid()
        and p.status = 'completed'
    )
  );

create policy "reviewers can update own reviews"
  on public.reviews
  for update
  to authenticated
  using (auth.uid() = reviewer_id)
  with check (auth.uid() = reviewer_id);

create policy "reviewers can delete own reviews"
  on public.reviews
  for delete
  to authenticated
  using (auth.uid() = reviewer_id);

-- ---------------------------------------------------------------------------
-- reactions
-- ---------------------------------------------------------------------------

create policy "reactions are publicly readable"
  on public.reactions
  for select
  using (true);

create policy "users can react to published repositories"
  on public.reactions
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.repositories r
      where r.id = repository_id
        and r.is_published = true
    )
  );

create policy "users can remove own reactions"
  on public.reactions
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- chats
-- ---------------------------------------------------------------------------

create policy "active chats are readable for authenticated users"
  on public.chats
  for select
  to authenticated
  using (
    status in ('active', 'closed', 'expired')
    or exists (
      select 1
      from public.repositories r
      where r.id = repository_id
        and r.owner_id = auth.uid()
    )
  );

create policy "repository owners can manage chats metadata"
  on public.chats
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.repositories r
      where r.id = repository_id
        and r.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.repositories r
      where r.id = repository_id
        and r.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

grant select on public.users to authenticated;
-- колоночный grant: пользователь не может менять reputation, депозит и Stripe IDs
grant update (username, display_name, avatar_url, bio) on public.users to authenticated;

grant select on public.profiles to anon, authenticated;

grant select, insert, update, delete on public.repositories to authenticated;
grant select on public.repositories to anon;

grant select, insert, update, delete on public.listings to authenticated;
grant select on public.listings to anon;

grant select, insert, update on public.purchases to authenticated;

grant select on public.forks to anon, authenticated;
grant insert on public.forks to authenticated;

grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;

grant select on public.reactions to anon, authenticated;
grant insert, delete on public.reactions to authenticated;

grant select, update on public.chats to authenticated;

grant execute on function public.expire_repository_chats() to service_role;
