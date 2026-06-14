-- Add category to repositories
alter table public.repositories
  add column category text
    check (category in ('apps', 'ui-components', 'prompts', 'templates'));

-- Allow anonymous users to read published repositories (needed for public Explore)
create policy "anon can read published repos"
  on public.repositories
  for select
  to anon
  using (is_published = true);

-- Allow anonymous users to read tags/listing data on published repos
grant select on public.repositories to anon;
