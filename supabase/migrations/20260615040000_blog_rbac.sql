-- ─────────────────────────────────────────────────────────────────────────────
-- Blog + Role-Based Access Control
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

create type public.app_role as enum ('admin', 'author');

-- ─── user_roles: source of truth for authorization ───────────────────────────

create table public.user_roles (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.users (id) on delete cascade,
  role       public.app_role not null,
  granted_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  constraint user_roles_unique unique (user_id, role)
);

create index user_roles_user_id_idx on public.user_roles (user_id);

alter table public.user_roles enable row level security;

-- Does the current user hold a given role? SECURITY DEFINER → bypasses RLS on
-- user_roles, so it's safe to call from within user_roles' own policies.
create or replace function public.has_role(_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = _role
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

-- A user may read their own roles; admins may read all.
create policy "read own roles or admin"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Only admins can grant/revoke roles. (First admin is seeded below via the
-- service-role context, which bypasses RLS.)
create policy "admins manage roles"
  on public.user_roles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.user_roles to authenticated;
grant insert, update, delete on public.user_roles to authenticated; -- gated to admins by RLS

-- ─── posts ───────────────────────────────────────────────────────────────────

create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique
                 check (slug ~ '^[a-z0-9-]{1,120}$'),
  title        text not null check (char_length(trim(title)) > 0),
  excerpt      text,
  body         text not null default '',  -- markdown
  cover_url    text,
  category     text,
  author_id    uuid not null references public.users (id) on delete restrict,
  status       text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index posts_published_idx on public.posts (status, published_at desc);
create index posts_author_idx on public.posts (author_id);

create trigger posts_set_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();

-- Stamp published_at the first time a post goes live.
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

create trigger posts_published_at
before insert or update on public.posts
for each row
execute function public.posts_stamp_published();

alter table public.posts enable row level security;

-- Read: published posts are public; authors see their own drafts; admins see all.
create policy "posts readable when published, own, or admin"
  on public.posts for select
  using (
    status = 'published'
    or author_id = auth.uid()
    or public.is_admin()
  );

-- Create: only authors/admins, and only as themselves.
create policy "authors and admins can create posts"
  on public.posts for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and (public.has_role('author') or public.has_role('admin'))
  );

-- Update: own post (author) or any post (admin).
create policy "authors edit own, admins edit any"
  on public.posts for update
  to authenticated
  using ((author_id = auth.uid() and public.has_role('author')) or public.is_admin())
  with check ((author_id = auth.uid() and public.has_role('author')) or public.is_admin());

-- Delete: own post (author) or any post (admin).
create policy "authors delete own, admins delete any"
  on public.posts for delete
  to authenticated
  using ((author_id = auth.uid() and public.has_role('author')) or public.is_admin());

grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;

-- ─── Seed the first admin ────────────────────────────────────────────────────
-- Runs in the SQL editor under a privileged role (bypasses RLS). Change the
-- email if needed. Safe to re-run.

insert into public.user_roles (user_id, role)
select u.id, 'admin'::public.app_role
from public.users u
join auth.users au on au.id = u.id
where au.email = 'admin@vydex.dev'
on conflict (user_id, role) do nothing;
