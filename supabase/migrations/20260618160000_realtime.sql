-- Enable Supabase Realtime for notifications + messages so the bell and the
-- messages badge update instantly (no refresh). RLS still applies to the
-- realtime stream, so users only receive their own rows. IDEMPOTENT.

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
