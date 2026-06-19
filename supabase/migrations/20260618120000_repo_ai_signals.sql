-- Heuristic "AI signals" detected from the uploaded ZIP (config files left by
-- AI coding tools). Clues only — surfaced as informational badges. IDEMPOTENT.

alter table public.repositories
  add column if not exists ai_signals text[] not null default '{}';
