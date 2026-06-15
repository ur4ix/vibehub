-- Vydex initial schema

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.repository_type as enum ('free', 'paid');

create type public.listing_status as enum (
  'draft',
  'active',
  'paused',
  'sold',
  'expired',
  'cancelled'
);

create type public.purchase_status as enum (
  'pending',
  'processing',
  'completed',
  'refunded',
  'failed',
  'disputed'
);

create type public.chat_status as enum ('locked', 'active', 'closed', 'expired');

create type public.reaction_type as enum ('like');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- users — профиль, репутация, депозит продавца
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text,
  avatar_url text,
  bio text,
  reputation integer not null default 0 check (reputation >= 0),
  seller_deposit_cents integer not null default 0 check (seller_deposit_cents >= 0),
  stripe_customer_id text,
  stripe_connect_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_username_unique unique (username),
  constraint users_username_format check (username ~ '^[a-z0-9_]{3,30}$')
);

create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate_username text;
  suffix integer := 0;
begin
  base_username := lower(
    regexp_replace(
      coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
      '[^a-z0-9_]',
      '_',
      'g'
    )
  );

  if char_length(base_username) < 3 then
    base_username := 'user';
  end if;

  base_username := left(base_username, 26);
  candidate_username := base_username;

  while exists (select 1 from public.users where username = candidate_username) loop
    suffix := suffix + 1;
    candidate_username := base_username || suffix::text;
  end loop;

  insert into public.users (id, username, display_name, avatar_url)
  values (
    new.id,
    candidate_username,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- repositories — код, тип (free/paid), цена, owner
-- ---------------------------------------------------------------------------

create table public.repositories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  slug text not null,
  description text,
  readme text,
  storage_path text,
  github_url text,
  type public.repository_type not null default 'free',
  price_cents integer check (price_cents is null or price_cents >= 0),
  chat_reaction_threshold integer not null default 10 check (chat_reaction_threshold > 0),
  reaction_count integer not null default 0 check (reaction_count >= 0),
  fork_count integer not null default 0 check (fork_count >= 0),
  average_rating numeric(3, 2) not null default 0 check (average_rating >= 0 and average_rating <= 5),
  review_count integer not null default 0 check (review_count >= 0),
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repositories_owner_slug_unique unique (owner_id, slug),
  constraint repositories_paid_price check (
    (type = 'free' and coalesce(price_cents, 0) = 0)
    or (type = 'paid' and price_cents is not null and price_cents > 0)
  )
);

create index repositories_owner_id_idx on public.repositories (owner_id);
create index repositories_type_idx on public.repositories (type);
create index repositories_published_idx on public.repositories (is_published, published_at desc);

create trigger repositories_set_updated_at
before update on public.repositories
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- listings — активные продажи, статус
-- ---------------------------------------------------------------------------

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.repositories (id) on delete cascade,
  seller_id uuid not null references public.users (id) on delete cascade,
  status public.listing_status not null default 'draft',
  price_cents integer not null check (price_cents > 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  title text,
  description text,
  published_at timestamptz,
  expires_at timestamptz,
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index listings_one_active_per_repository_idx
  on public.listings (repository_id)
  where status = 'active';

create index listings_seller_id_idx on public.listings (seller_id);
create index listings_status_idx on public.listings (status);

create trigger listings_set_updated_at
before update on public.listings
for each row
execute function public.set_updated_at();

create or replace function public.validate_listing_seller()
returns trigger
language plpgsql
as $$
declare
  repo_owner uuid;
begin
  select owner_id into repo_owner
  from public.repositories
  where id = new.repository_id;

  if repo_owner is null then
    raise exception 'repository not found';
  end if;

  if new.seller_id <> repo_owner then
    raise exception 'listing seller must match repository owner';
  end if;

  return new;
end;
$$;

create trigger listings_validate_seller
before insert or update on public.listings
for each row
execute function public.validate_listing_seller();

-- ---------------------------------------------------------------------------
-- purchases — история покупок, buyer, seller
-- ---------------------------------------------------------------------------

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  repository_id uuid not null references public.repositories (id) on delete restrict,
  buyer_id uuid not null references public.users (id) on delete restrict,
  seller_id uuid not null references public.users (id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  platform_fee_cents integer not null default 0 check (platform_fee_cents >= 0),
  stripe_payment_intent_id text,
  status public.purchase_status not null default 'pending',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchases_buyer_not_seller check (buyer_id <> seller_id),
  constraint purchases_stripe_payment_intent_unique unique (stripe_payment_intent_id)
);

create index purchases_buyer_id_idx on public.purchases (buyer_id, created_at desc);
create index purchases_seller_id_idx on public.purchases (seller_id, created_at desc);
create index purchases_repository_id_idx on public.purchases (repository_id);
create index purchases_status_idx on public.purchases (status);

create trigger purchases_set_updated_at
before update on public.purchases
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- forks — связь оригинал → форк
-- ---------------------------------------------------------------------------

create table public.forks (
  id uuid primary key default gen_random_uuid(),
  original_repository_id uuid not null references public.repositories (id) on delete cascade,
  forked_repository_id uuid not null references public.repositories (id) on delete cascade,
  forked_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint forks_distinct_repositories check (original_repository_id <> forked_repository_id),
  constraint forks_forked_repository_unique unique (forked_repository_id)
);

create index forks_original_repository_id_idx on public.forks (original_repository_id);
create index forks_forked_by_idx on public.forks (forked_by);

create or replace function public.sync_repository_fork_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.repositories
    set fork_count = fork_count + 1
    where id = new.original_repository_id;

    return new;
  elsif tg_op = 'DELETE' then
    update public.repositories
    set fork_count = greatest(fork_count - 1, 0)
    where id = old.original_repository_id;

    return old;
  end if;

  return null;
end;
$$;

create trigger forks_sync_count
after insert or delete on public.forks
for each row
execute function public.sync_repository_fork_count();

-- ---------------------------------------------------------------------------
-- reviews — оценка после покупки
-- ---------------------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  repository_id uuid not null references public.repositories (id) on delete cascade,
  reviewer_id uuid not null references public.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_one_per_purchase unique (purchase_id)
);

create index reviews_repository_id_idx on public.reviews (repository_id, created_at desc);
create index reviews_reviewer_id_idx on public.reviews (reviewer_id);

create trigger reviews_set_updated_at
before update on public.reviews
for each row
execute function public.set_updated_at();

create or replace function public.validate_review()
returns trigger
language plpgsql
as $$
declare
  purchase record;
begin
  select buyer_id, status, repository_id
  into purchase
  from public.purchases
  where id = new.purchase_id;

  if not found then
    raise exception 'purchase not found';
  end if;

  if purchase.status <> 'completed' then
    raise exception 'reviews are allowed only for completed purchases';
  end if;

  if new.reviewer_id <> purchase.buyer_id then
    raise exception 'reviewer must be the purchase buyer';
  end if;

  if new.repository_id <> purchase.repository_id then
    raise exception 'review repository must match purchase repository';
  end if;

  return new;
end;
$$;

create trigger reviews_validate
before insert or update on public.reviews
for each row
execute function public.validate_review();

create or replace function public.sync_repository_review_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_repository_id uuid;
begin
  if tg_op = 'DELETE' then
    target_repository_id := old.repository_id;
  else
    target_repository_id := new.repository_id;
  end if;

  update public.repositories r
  set
    review_count = stats.review_count,
    average_rating = stats.average_rating
  from (
    select
      count(*)::integer as review_count,
      coalesce(round(avg(rating)::numeric, 2), 0) as average_rating
    from public.reviews
    where repository_id = target_repository_id
  ) as stats
  where r.id = target_repository_id;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger reviews_sync_stats
after insert or update or delete on public.reviews
for each row
execute function public.sync_repository_review_stats();

create or replace function public.apply_review_reputation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  seller uuid;
  delta integer := 0;
begin
  if tg_op = 'INSERT' then
    delta := new.rating - 3;
  elsif tg_op = 'UPDATE' then
    delta := new.rating - old.rating;
  elsif tg_op = 'DELETE' then
    delta := 3 - old.rating;
  end if;

  select seller_id into seller
  from public.purchases
  where id = coalesce(new.purchase_id, old.purchase_id);

  update public.users
  set reputation = greatest(reputation + delta, 0)
  where id = seller;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger reviews_apply_reputation
after insert or update or delete on public.reviews
for each row
execute function public.apply_review_reputation();

-- ---------------------------------------------------------------------------
-- chats — временные чаты (открываются по порогу реакций)
-- ---------------------------------------------------------------------------

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.repositories (id) on delete cascade,
  status public.chat_status not null default 'locked',
  reaction_threshold integer not null check (reaction_threshold > 0),
  reactions_at_open integer check (reactions_at_open is null or reactions_at_open >= 0),
  opened_at timestamptz,
  expires_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chats_repository_unique unique (repository_id),
  constraint chats_open_state check (
    (status = 'locked' and opened_at is null)
    or (status <> 'locked' and opened_at is not null)
  )
);

create index chats_status_idx on public.chats (status);
create index chats_expires_at_idx on public.chats (expires_at)
  where status = 'active';

create trigger chats_set_updated_at
before update on public.chats
for each row
execute function public.set_updated_at();

create or replace function public.create_repository_chat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chats (repository_id, reaction_threshold)
  values (new.id, new.chat_reaction_threshold)
  on conflict (repository_id) do nothing;

  return new;
end;
$$;

create trigger repositories_create_chat
after insert on public.repositories
for each row
execute function public.create_repository_chat();

create or replace function public.try_open_repository_chat(p_repository_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  repo record;
begin
  select id, reaction_count, chat_reaction_threshold
  into repo
  from public.repositories
  where id = p_repository_id;

  if not found then
    return;
  end if;

  if repo.reaction_count < repo.chat_reaction_threshold then
    return;
  end if;

  update public.chats
  set
    status = 'active',
    reactions_at_open = repo.reaction_count,
    opened_at = coalesce(opened_at, now()),
    expires_at = coalesce(expires_at, now() + interval '7 days'),
    closed_at = null
  where repository_id = p_repository_id
    and status = 'locked';
end;
$$;

create or replace function public.expire_repository_chats()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.chats
  set
    status = 'expired',
    closed_at = coalesce(closed_at, now())
  where status = 'active'
    and expires_at is not null
    and expires_at <= now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- ---------------------------------------------------------------------------
-- reactions — лайки на репозитории
-- ---------------------------------------------------------------------------

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.repositories (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  type public.reaction_type not null default 'like',
  created_at timestamptz not null default now(),
  constraint reactions_unique_per_user unique (repository_id, user_id, type)
);

create index reactions_repository_id_idx on public.reactions (repository_id);
create index reactions_user_id_idx on public.reactions (user_id);

create or replace function public.sync_repository_reaction_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.repositories
    set reaction_count = reaction_count + 1
    where id = new.repository_id;

    perform public.try_open_repository_chat(new.repository_id);
    return new;
  elsif tg_op = 'DELETE' then
    update public.repositories
    set reaction_count = greatest(reaction_count - 1, 0)
    where id = old.repository_id;

    return old;
  end if;

  return null;
end;
$$;

create trigger reactions_sync_count
after insert or delete on public.reactions
for each row
execute function public.sync_repository_reaction_count();
