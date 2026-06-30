-- Money hardening: rate limits on funding/token tables + ledger reconciliation.
-- IDEMPOTENT. Reuses enforce_rate_limit() from 20260621120000.

-- ── Rate limits (DB-enforced, can't be bypassed via the API) ────────────────
drop trigger if exists topups_rl on public.topups;
create trigger topups_rl before insert on public.topups
  for each row execute function public.enforce_rate_limit('user_id', '3600', '10');

drop trigger if exists withdrawals_rl on public.withdrawals;
create trigger withdrawals_rl before insert on public.withdrawals
  for each row execute function public.enforce_rate_limit('user_id', '3600', '5');

drop trigger if exists api_tokens_rl on public.api_tokens;
create trigger api_tokens_rl before insert on public.api_tokens
  for each row execute function public.enforce_rate_limit('user_id', '3600', '10');

-- ── Ledger reconciliation ───────────────────────────────────────────────────
-- Returns users whose cached balance disagrees with the sum of their ledger
-- entries (should always be empty; non-empty = a bug to investigate). Admin/
-- service-role only.
create or replace function public.balance_reconciliation()
returns table (user_id uuid, balance_cents integer, ledger_cents bigint, drift_cents bigint)
language sql
security definer
set search_path = public
as $$
  select u.id,
         u.balance_cents,
         coalesce(l.s, 0)::bigint,
         (u.balance_cents - coalesce(l.s, 0))::bigint
  from public.users u
  left join (
    select user_id, sum(amount_cents) as s
    from public.balance_entries
    group by user_id
  ) l on l.user_id = u.id
  where u.balance_cents <> coalesce(l.s, 0);
$$;

revoke execute on function public.balance_reconciliation() from public, anon, authenticated;
grant  execute on function public.balance_reconciliation() to service_role;
