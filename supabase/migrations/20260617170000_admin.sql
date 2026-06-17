-- ─────────────────────────────────────────────────────────────────────────────
-- Admin control panel support  (IDEMPOTENT — safe to re-run)
--
-- Builds on the existing RBAC (user_roles / is_admin). Role management already
-- works via the "admins manage roles" policy on user_roles; here we add:
--   • read access across core tables for admins (RLS is OR-ed, so regular users
--     are unaffected — they still only see their own / published rows),
--   • a guarded RPC to adjust a user's reputation.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Admin read access ───────────────────────────────────────────────────────
drop policy if exists "admins read all users" on public.users;
create policy "admins read all users"
  on public.users for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins read all repositories" on public.repositories;
create policy "admins read all repositories"
  on public.repositories for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins read all jobs" on public.jobs;
create policy "admins read all jobs"
  on public.jobs for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins read all orders" on public.orders;
create policy "admins read all orders"
  on public.orders for select
  to authenticated
  using (public.is_admin());

-- ─── Adjust reputation (admin-gated, SECURITY DEFINER) ───────────────────────
create or replace function public.admin_set_reputation(target uuid, value integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  update public.users set reputation = greatest(0, value) where id = target;
end;
$$;

grant execute on function public.admin_set_reputation(uuid, integer) to authenticated;
