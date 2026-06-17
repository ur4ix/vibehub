-- ═════════════════════════════════════════════════════════════════════════════
-- Repository previews: screenshots gallery + live demo URL  (IDEMPOTENT)
--
-- So buyers can see what a project looks like / try it before paying.
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.repositories
  add column if not exists demo_url       text,
  add column if not exists preview_images text[] not null default '{}';

-- ─── public bucket for preview screenshots ───────────────────────────────────
insert into storage.buckets (id, name, public)
values ('repo-previews', 'repo-previews', true)
on conflict (id) do update set public = true;

drop policy if exists "users upload own previews" on storage.objects;
create policy "users upload own previews"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'repo-previews'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users update own previews" on storage.objects;
create policy "users update own previews"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'repo-previews'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete own previews" on storage.objects;
create policy "users delete own previews"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'repo-previews'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "previews are publicly readable" on storage.objects;
create policy "previews are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'repo-previews');

-- ─── include demo_url in the banned-word guard (best effort) ──────────────────
do $$ begin
  drop trigger if exists repositories_bw on public.repositories;
  create trigger repositories_bw before insert or update on public.repositories
    for each row execute function public.bw_guard_with_tags('title', 'slug', 'description', 'demo_url');
exception when undefined_function then
  raise notice 'bw_guard_with_tags not found — run 20260617180000_banned_words.sql first';
end $$;
