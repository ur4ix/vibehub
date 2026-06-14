-- Add social profile links to users table
alter table public.users
  add column github_username      text check (length(github_username) <= 39),
  add column huggingface_username text check (length(huggingface_username) <= 80),
  add column x_username           text check (length(x_username) <= 50);

-- Allow authenticated users to update their own social links
grant update (github_username, huggingface_username, x_username)
  on public.users
  to authenticated;
