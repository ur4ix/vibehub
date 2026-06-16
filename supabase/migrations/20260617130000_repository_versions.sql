-- Version history for repositories — each "commit" is a new ZIP + changelog.
-- price_cents is reserved for paid updates/DLC later (null/0 = free update).

create table public.repository_versions (
  id            uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.repositories (id) on delete cascade,
  version       text not null,
  changelog     text,
  storage_path  text not null,
  price_cents   integer check (price_cents is null or price_cents >= 0),
  created_at    timestamptz not null default now(),
  constraint repository_versions_unique unique (repository_id, version)
);

create index repository_versions_repo_idx
  on public.repository_versions (repository_id, created_at desc);

alter table public.repository_versions enable row level security;

-- Read: visible whenever the parent repository is (published, or owned).
create policy "versions readable when repo is visible"
  on public.repository_versions for select
  using (
    exists (
      select 1 from public.repositories r
      where r.id = repository_id
        and (r.is_published = true or r.owner_id = auth.uid())
    )
  );

-- Manage: only the repository owner.
create policy "owners manage repository versions"
  on public.repository_versions for all
  to authenticated
  using (
    exists (
      select 1 from public.repositories r
      where r.id = repository_id and r.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.repositories r
      where r.id = repository_id and r.owner_id = auth.uid()
    )
  );

grant select on public.repository_versions to anon, authenticated;
grant insert, update, delete on public.repository_versions to authenticated;
