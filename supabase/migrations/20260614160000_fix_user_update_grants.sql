-- Ensure authenticated users can update all profile columns.
-- Safe to re-run: GRANT is idempotent in PostgreSQL.
grant update (
  username,
  display_name,
  avatar_url,
  bio,
  github_username,
  huggingface_username,
  x_username
) on public.users to authenticated;
