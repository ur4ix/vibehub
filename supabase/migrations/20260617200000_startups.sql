-- ═════════════════════════════════════════════════════════════════════════════
-- Startups board + investor/partner roles  (IDEMPOTENT — safe to re-run)
--
-- Founders list their startups so investors/partners can discover them.
-- Adds two roles to the RBAC enum and makes partner/investor roles publicly
-- readable (so a badge can show on profiles), while admin stays private.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── new roles ───────────────────────────────────────────────────────────────
-- ALTER TYPE ... ADD VALUE is idempotent with IF NOT EXISTS (PG12+).
alter type public.app_role add value if not exists 'investor';
alter type public.app_role add value if not exists 'partner';

-- Partner / investor roles are public (badge); admin remains private.
-- NOTE: compare role::text (not 'investor'::app_role) so this can run in the
-- same transaction that just added the enum values — Postgres forbids *using*
-- a freshly added enum value before its tx commits, but a text comparison
-- against a string literal doesn't count as using the enum value.
drop policy if exists "public can read partner roles" on public.user_roles;
create policy "public can read partner roles"
  on public.user_roles for select
  using (role::text in ('investor', 'partner'));

grant select on public.user_roles to anon;

-- ─── startups ────────────────────────────────────────────────────────────────
create table if not exists public.startups (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.users on delete cascade,
  name           text not null,
  tagline        text not null,
  description    text not null,
  website        text,
  industry       text,
  stage          text not null default 'idea'
    check (stage in ('idea', 'mvp', 'launched', 'revenue', 'scaling')),
  funding_status text not null default 'bootstrapped'
    check (funding_status in ('bootstrapped', 'raising', 'funded')),
  raising_amount numeric,
  tags           text[] not null default '{}',
  created_at     timestamptz not null default now()
);

create index if not exists startups_owner_idx on public.startups (owner_id);
create index if not exists startups_created_idx on public.startups (created_at desc);

alter table public.startups enable row level security;

drop policy if exists "startups are public" on public.startups;
create policy "startups are public"
  on public.startups for select
  using (true);

drop policy if exists "owners manage own startups" on public.startups;
create policy "owners manage own startups"
  on public.startups for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

grant select on public.startups to anon, authenticated;
grant insert, update, delete on public.startups to authenticated;

-- ─── banned-word guard (depends on bw_guard_with_tags from 20260617180000) ────
do $$ begin
  drop trigger if exists startups_bw on public.startups;
  create trigger startups_bw before insert or update on public.startups
    for each row execute function public.bw_guard_with_tags('name', 'tagline', 'description', 'website');
exception when undefined_function then
  raise notice 'bw_guard_with_tags not found — run 20260617180000_banned_words.sql first for startup moderation';
end $$;
