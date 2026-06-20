-- Known-vulnerability findings (OSV.dev) for the repo's dependencies, captured
-- at publish time. Each entry is a short human-readable summary. IDEMPOTENT.

alter table public.repositories
  add column if not exists vuln_findings text[] not null default '{}';
