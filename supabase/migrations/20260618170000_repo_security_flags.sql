-- Heuristic security-scan flags (rule ids) captured from the uploaded ZIP at
-- publish time. Clues only — not antivirus, not proof of safety. Shown to buyers
-- and moderators. IDEMPOTENT.

alter table public.repositories
  add column if not exists security_flags text[] not null default '{}';
