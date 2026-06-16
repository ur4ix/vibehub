-- AI provenance disclosure on repositories (self-declared at upload).
-- ai_tools: which AI tools the author used (e.g. Claude, Cursor, v0).
-- ai_assisted: convenience flag = ai_tools is non-empty.

alter table public.repositories
  add column if not exists ai_assisted boolean not null default false,
  add column if not exists ai_tools    text[]  not null default '{}';
