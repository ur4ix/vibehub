-- ═════════════════════════════════════════════════════════════════════════════
-- Team + Moderator roles; hard-lock the admin role  (IDEMPOTENT)
--
--   • admin  — hardcoded superuser (seeded to the platform owner only). Admins
--     can manage every role EXCEPT admin, so it can never be granted/revoked
--     through the app or API. Only a direct DB seed sets it.
--   • team   — staff badge, no special powers.
--   • moderator — can delete user content (reviews, repos, jobs, orders, startups,
--     posts). Admin can too (is_staff = admin OR moderator).
--
-- NOTE: comparisons use role::text so this can run in the same transaction that
-- adds the new enum values (Postgres forbids using a fresh enum value mid-tx).
-- ═════════════════════════════════════════════════════════════════════════════

alter type public.app_role add value if not exists 'team';
alter type public.app_role add value if not exists 'moderator';

-- ─── staff helper (admin or moderator) ───────────────────────────────────────
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role::text in ('admin', 'moderator')
  );
$$;

grant execute on function public.is_staff() to authenticated;

-- ─── role management: admins manage all roles EXCEPT admin ────────────────────
drop policy if exists "admins manage roles" on public.user_roles;

drop policy if exists "admins grant non-admin roles" on public.user_roles;
create policy "admins grant non-admin roles"
  on public.user_roles for insert
  to authenticated
  with check (public.is_admin() and role::text <> 'admin');

drop policy if exists "admins update non-admin roles" on public.user_roles;
create policy "admins update non-admin roles"
  on public.user_roles for update
  to authenticated
  using (public.is_admin() and role::text <> 'admin')
  with check (public.is_admin() and role::text <> 'admin');

drop policy if exists "admins revoke non-admin roles" on public.user_roles;
create policy "admins revoke non-admin roles"
  on public.user_roles for delete
  to authenticated
  using (public.is_admin() and role::text <> 'admin');

-- ─── public badges: team / moderator / partner / investor (admin stays private)
drop policy if exists "public can read partner roles" on public.user_roles;
drop policy if exists "public can read badge roles" on public.user_roles;
create policy "public can read badge roles"
  on public.user_roles for select
  using (role::text in ('investor', 'partner', 'team', 'moderator'));

-- ─── staff (admin/moderator) can delete user content ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array['reviews','repositories','jobs','orders','startups','posts'] loop
    execute format('grant delete on public.%I to authenticated', t);
    execute format('drop policy if exists "staff can delete %1$s" on public.%1$I', t);
    execute format(
      'create policy "staff can delete %1$s" on public.%1$I for delete to authenticated using (public.is_staff())',
      t
    );
  end loop;
end $$;
