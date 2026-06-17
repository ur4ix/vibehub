-- File listing (GitHub-style) for repositories. The flat list of file paths is
-- captured from the uploaded ZIP at publish time and shown on the listing.
-- Showing the tree is safe for everyone; viewing/downloading file CONTENTS is
-- still gated by the existing storage RLS (free/owner/purchased). IDEMPOTENT.

alter table public.repositories
  add column if not exists file_manifest text[] not null default '{}';
