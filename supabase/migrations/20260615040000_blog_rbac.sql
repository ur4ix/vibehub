-- ─────────────────────────────────────────────────────────────────────────────
-- Blog + Role-Based Access Control  (IDEMPOTENT — safe to re-run)
--
-- Authorization lives in its own table (`user_roles`), separate from the
-- user-editable profile row. RLS is the security boundary and reads roles via
-- SECURITY DEFINER helpers (`has_role`, `is_admin`) so:
--   • a user can never grant themselves a role (no UPDATE path to user_roles),
--   • policies don't recurse (definer functions bypass RLS on user_roles),
--   • the client is never trusted — every write is checked in Postgres.
--
-- Roles: 'admin' (manages everything incl. roles + any post),
--        'author' (writes and edits only their own posts).
-- A plain authenticated user with no row is a reader.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── app_role enum ───────────────────────────────────────────────────────────
do $$ begin
  create type public.app_role as enum ('admin', 'author');
exception when duplicate_object then null;
end $$;

-- ─── user_roles: source of truth for authorization ───────────────────────────
create table if not exists public.user_roles (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.users (id) on delete cascade,
  role       public.app_role not null,
  granted_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  constraint user_roles_unique unique (user_id, role)
);

create index if not exists user_roles_user_id_idx on public.user_roles (user_id);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = _role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin');
$$;

grant execute on function public.has_role(public.app_role) to authenticated;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "read own roles or admin" on public.user_roles;
create policy "read own roles or admin"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admins manage roles" on public.user_roles;
create policy "admins manage roles"
  on public.user_roles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.user_roles to authenticated;
grant insert, update, delete on public.user_roles to authenticated; -- gated to admins by RLS

-- ─── posts ───────────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null,
  title        text not null,
  excerpt      text,
  body         text not null default '',
  cover_url    text,
  category     text,
  author_id    uuid not null references public.users (id) on delete restrict,
  status       text not null default 'draft',
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Reconcile columns in case an older/leftover `posts` table is present.
alter table public.posts add column if not exists slug         text;
alter table public.posts add column if not exists title        text;
alter table public.posts add column if not exists excerpt      text;
alter table public.posts add column if not exists body         text;
alter table public.posts add column if not exists cover_url    text;
alter table public.posts add column if not exists category     text;
alter table public.posts add column if not exists author_id    uuid;
alter table public.posts add column if not exists status       text;
alter table public.posts add column if not exists published_at timestamptz;
alter table public.posts add column if not exists created_at   timestamptz;
alter table public.posts add column if not exists updated_at   timestamptz;

-- Status check + unique slug (guarded so re-runs don't error).
do $$ begin
  alter table public.posts add constraint posts_status_check
    check (status in ('draft', 'published'));
exception when duplicate_object then null;
end $$;

create unique index if not exists posts_slug_key on public.posts (slug);
create index if not exists posts_published_idx on public.posts (status, published_at desc);
create index if not exists posts_author_idx on public.posts (author_id);

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

create or replace function public.posts_stamp_published()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists posts_published_at on public.posts;
create trigger posts_published_at
before insert or update on public.posts
for each row execute function public.posts_stamp_published();

alter table public.posts enable row level security;

drop policy if exists "posts readable when published, own, or admin" on public.posts;
create policy "posts readable when published, own, or admin"
  on public.posts for select
  using (status = 'published' or author_id = auth.uid() or public.is_admin());

drop policy if exists "authors and admins can create posts" on public.posts;
create policy "authors and admins can create posts"
  on public.posts for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and (public.has_role('author') or public.has_role('admin'))
  );

drop policy if exists "authors edit own, admins edit any" on public.posts;
create policy "authors edit own, admins edit any"
  on public.posts for update
  to authenticated
  using ((author_id = auth.uid() and public.has_role('author')) or public.is_admin())
  with check ((author_id = auth.uid() and public.has_role('author')) or public.is_admin());

drop policy if exists "authors delete own, admins delete any" on public.posts;
create policy "authors delete own, admins delete any"
  on public.posts for delete
  to authenticated
  using ((author_id = auth.uid() and public.has_role('author')) or public.is_admin());

grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;

-- ─── Seed the first admin (safe to re-run) ───────────────────────────────────
insert into public.user_roles (user_id, role)
select u.id, 'admin'::public.app_role
from public.users u
join auth.users au on au.id = u.id
where au.email = 'admin@vydex.dev'
on conflict (user_id, role) do nothing;
