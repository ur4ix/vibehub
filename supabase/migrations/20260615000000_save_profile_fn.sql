-- Profile save function — runs as the authenticated user (security invoker)
-- and does an INSERT … ON CONFLICT UPDATE so both first-time and
-- returning users are handled in one round-trip.

create or replace function public.save_profile(
  p_username            text,
  p_display_name        text,
  p_bio                 text,
  p_github_username     text,
  p_huggingface_username text,
  p_x_username          text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.users (
    id, username, display_name, bio,
    github_username, huggingface_username, x_username
  )
  values (
    auth.uid(), p_username, p_display_name, p_bio,
    p_github_username, p_huggingface_username, p_x_username
  )
  on conflict (id) do update set
    username              = excluded.username,
    display_name          = excluded.display_name,
    bio                   = excluded.bio,
    github_username       = excluded.github_username,
    huggingface_username  = excluded.huggingface_username,
    x_username            = excluded.x_username,
    updated_at            = now();
end;
$$;

grant execute on function public.save_profile(text, text, text, text, text, text)
  to authenticated;
