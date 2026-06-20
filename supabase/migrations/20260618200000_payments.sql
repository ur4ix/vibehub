-- Payments core (provider-agnostic). IDEMPOTENT.
--
-- Security: a buyer must NOT be able to mark a purchase completed themselves
-- (that would unlock the download without paying). Buyers may only create a
-- *pending* purchase; completion happens only via the payment webhook, which
-- runs with the service role and bypasses RLS. The free-repo path uses the
-- SECURITY DEFINER claim_free_repo() (table owner → not subject to RLS).

alter table public.purchases
  add column if not exists provider     text,
  add column if not exists provider_ref text;

-- Restrict client inserts to pending only (status is set by the webhook).
drop policy if exists "buyers can create purchases" on public.purchases;
drop policy if exists "buyers can create pending purchases" on public.purchases;
create policy "buyers can create pending purchases"
  on public.purchases for insert
  to authenticated
  with check (auth.uid() = buyer_id and status = 'pending');

-- Clients have no reason to update purchases; remove the broad update policy
-- so completion can't be forged via the API.
drop policy if exists "participants can update own purchases" on public.purchases;
