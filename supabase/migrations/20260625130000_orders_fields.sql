-- Extra fields for the redesigned order form. IDEMPOTENT.
-- `budget` (numeric, not null) is kept for sorting/compat and stores the lower
-- bound of the chosen range; `budget_range` holds the human label ("$500–1k").
alter table public.orders
  add column if not exists project_type    text,
  add column if not exists budget_range    text,
  add column if not exists reference_links text,
  add column if not exists contact         text;
