-- Fork-of-paid protection + escrow tightening. IDEMPOTENT.
--
-- Problem: a buyer of a PAID repo could Fork it (the fork copies the source
-- archive), flip the copy to FREE, publish it, and hand out the paid project for
-- nothing. This closes that hole at the database level (not just in the UI):
--
--   A published fork of someone else's PAID repo must
--     (a) stay PAID at a price >= the original, and
--     (b) actually differ from the original (its archive hash must change).
--
-- We compare the byte hash of the source ZIP (repositories.source_sha256). A
-- fresh fork is a byte-for-byte copy, so its hash equals the original's until the
-- forker uploads modified code — at which point publishing is allowed.

-- ── content hash of the uploaded source archive ─────────────────────────────
alter table public.repositories
  add column if not exists source_sha256 text;

create index if not exists repositories_source_sha256_idx
  on public.repositories (source_sha256)
  where source_sha256 is not null;

-- ── publish guard for copies of paid repositories ───────────────────────────
create or replace function public.enforce_fork_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  orig record;
begin
  -- Only relevant when the repo is (being) published.
  if NEW.is_published is not true then
    return NEW;
  end if;

  -- Skip unrelated updates (e.g. a view-count bump) so we don't run the hash
  -- lookup on every write — only re-check when something material changed.
  if TG_OP = 'UPDATE'
     and OLD.is_published is true
     and NEW.source_sha256 is not distinct from OLD.source_sha256
     and NEW.type = OLD.type
     and coalesce(NEW.price_cents, 0) = coalesce(OLD.price_cents, 0) then
    return NEW;
  end if;

  -- (1) Byte-identical copy of someone else's PAID project? Block outright.
  -- This catches both the Fork button and a hand-rolled storage copy that skips
  -- the forks table, because the archive bytes (hash) are the same either way.
  if NEW.source_sha256 is not null then
    perform 1
    from public.repositories r
    where r.source_sha256 = NEW.source_sha256
      and r.id <> NEW.id
      and r.owner_id <> NEW.owner_id
      and r.type = 'paid'
      and coalesce(r.price_cents, 0) > 0;
    if found then
      raise exception 'This is an unmodified copy of another seller''s paid project — change the code before publishing it.'
        using errcode = 'check_violation';
    end if;
  end if;

  -- (2) A (modified) fork of someone else's PAID project must stay paid at
  -- >= the original price. Covers originals uploaded before hashing existed.
  select r.owner_id, r.type, r.price_cents
    into orig
  from public.forks f
  join public.repositories r on r.id = f.original_repository_id
  where f.forked_repository_id = NEW.id
  limit 1;

  if found
     and orig.type = 'paid'
     and coalesce(orig.price_cents, 0) > 0
     and orig.owner_id <> NEW.owner_id then
    if NEW.type <> 'paid' or coalesce(NEW.price_cents, 0) < coalesce(orig.price_cents, 0) then
      raise exception 'A fork of a paid project must stay paid at no less than the original price ($%).',
          to_char(coalesce(orig.price_cents, 0) / 100.0, 'FM999999990.00')
        using errcode = 'check_violation';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists repositories_enforce_fork_publish on public.repositories;
create trigger repositories_enforce_fork_publish
  before insert or update on public.repositories
  for each row execute function public.enforce_fork_publish();

-- ── tighten buyer escrow control ────────────────────────────────────────────
-- A buyer may only move escrow on a purchase that actually completed (paid).
drop policy if exists "buyer manages own escrow" on public.purchases;
create policy "buyer manages own escrow"
  on public.purchases for update
  to authenticated
  using (auth.uid() = buyer_id and status = 'completed')
  with check (auth.uid() = buyer_id and escrow_status in ('released', 'disputed'));
