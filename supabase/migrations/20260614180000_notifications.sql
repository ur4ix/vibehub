create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users on delete cascade,
  type       text not null default 'system',
  title      text not null,
  body       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "users can read own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can update own notifications"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- service_role inserts notifications on behalf of users
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;

-- seed a welcome notification for every new user
create or replace function public.create_welcome_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, title, body)
  values (
    new.id,
    'system',
    'Welcome to VibeHub!',
    'Your account is set up. Start by publishing your first project.'
  );
  return new;
end;
$$;

create trigger on_user_created_notification
  after insert on public.users
  for each row execute function public.create_welcome_notification();
