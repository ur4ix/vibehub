-- ═════════════════════════════════════════════════════════════════════════════
-- Direct messages (1:1)  (IDEMPOTENT — safe to re-run)
--
-- Lets any two users hold a private conversation — so a founder can reply to an
-- investor who expressed interest, a poster can talk to an applicant, etc.
-- Conversations are derived from sender/recipient pairs (no separate table).
-- ═════════════════════════════════════════════════════════════════════════════

create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.users on delete cascade,
  recipient_id uuid not null references public.users on delete cascade,
  body         text not null,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint messages_not_self check (sender_id <> recipient_id)
);

create index if not exists messages_pair_idx on public.messages (sender_id, recipient_id, created_at);
create index if not exists messages_inbox_idx on public.messages (recipient_id, created_at desc);
create index if not exists messages_unread_idx on public.messages (recipient_id) where not is_read;

alter table public.messages enable row level security;

drop policy if exists "send own messages" on public.messages;
create policy "send own messages"
  on public.messages for insert
  to authenticated
  with check (sender_id = auth.uid());

drop policy if exists "read own conversations" on public.messages;
create policy "read own conversations"
  on public.messages for select
  to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists "recipient marks read" on public.messages;
create policy "recipient marks read"
  on public.messages for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

grant select, insert on public.messages to authenticated;
grant update (is_read) on public.messages to authenticated;

-- Banned-word guard on the message body (depends on bw_guard).
do $$ begin
  drop trigger if exists messages_bw on public.messages;
  create trigger messages_bw before insert or update on public.messages
    for each row execute function public.bw_guard('body');
exception when undefined_function then
  raise notice 'bw_guard not found — run 20260617180000_banned_words.sql first';
end $$;
