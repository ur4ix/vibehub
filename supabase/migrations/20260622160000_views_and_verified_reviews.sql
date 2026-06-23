-- Repository view counter + "verified purchase" flag on reviews. IDEMPOTENT.

-- ─── View counter ────────────────────────────────────────────────────────────
alter table public.repositories
  add column if not exists view_count integer not null default 0;

-- Anyone (incl. anon) can bump a view; SECURITY DEFINER so it isn't blocked by
-- RLS. Called at most once per session per repo from the client.
create or replace function public.increment_repo_view(p_repo uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.repositories set view_count = view_count + 1 where id = p_repo;
end;
$$;

grant execute on function public.increment_repo_view(uuid) to anon, authenticated;

-- ─── Verified-purchase flag on reviews ───────────────────────────────────────
-- true when the review's purchase was paid (amount > 0). Lets the UI mark which
-- reviewers actually bought vs. claimed it for free — even if the repo later
-- becomes paid/private. It's a column on the (publicly readable) reviews, so no
-- purchase amount is exposed.
alter table public.reviews
  add column if not exists verified_purchase boolean not null default false;

create or replace function public.set_review_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select (p.amount_cents > 0) into new.verified_purchase
  from public.purchases p where p.id = new.purchase_id;
  return new;
end;
$$;

drop trigger if exists reviews_set_verified on public.reviews;
create trigger reviews_set_verified
  before insert on public.reviews
  for each row execute function public.set_review_verified();

-- Backfill existing reviews.
update public.reviews r
  set verified_purchase = (p.amount_cents > 0)
  from public.purchases p
  where p.id = r.purchase_id;
