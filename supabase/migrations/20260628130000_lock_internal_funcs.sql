-- SECURITY: lock down internal money functions. IDEMPOTENT.
--
-- Postgres grants EXECUTE to PUBLIC by default, so without this an authenticated
-- user could call post_ledger() over PostgREST and mint themselves balance (it
-- has no internal auth check — it's meant to be called only by SECURITY DEFINER
-- functions running as the owner, and by the service role). Same for the cron-only
-- auto_release_due_orders(). Revoke from everyone, then re-grant to service_role.
revoke execute on function public.post_ledger(uuid, integer, text, uuid, text) from public, anon, authenticated;
grant  execute on function public.post_ledger(uuid, integer, text, uuid, text) to service_role;

revoke execute on function public.auto_release_due_orders() from public, anon, authenticated;
grant  execute on function public.auto_release_due_orders() to service_role;
