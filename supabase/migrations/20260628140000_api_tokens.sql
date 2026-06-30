-- Personal API tokens for the `vydex` CLI (push from the terminal / CI).
-- IDEMPOTENT. Only a SHA-256 hash of the token is stored — the plaintext is
-- shown to the user once at creation time and never again.
create table if not exists public.api_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  name         text not null,
  token_hash   text not null unique,
  token_prefix text not null,          -- first chars, for display only
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists api_tokens_user_idx on public.api_tokens (user_id, created_at desc);

alter table public.api_tokens enable row level security;

-- Owners can list and revoke their own tokens. Creation happens server-side
-- (the route hashes the secret), and lookups by hash use the service role.
drop policy if exists "read own tokens" on public.api_tokens;
create policy "read own tokens" on public.api_tokens for select to authenticated using (auth.uid() = user_id);
drop policy if exists "delete own tokens" on public.api_tokens;
create policy "delete own tokens" on public.api_tokens for delete to authenticated using (auth.uid() = user_id);

grant select, delete on public.api_tokens to authenticated;
