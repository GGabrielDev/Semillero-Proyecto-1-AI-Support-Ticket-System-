-- Categories table
create table if not exists public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "All authenticated users can view categories" on public.categories
  for select using (auth.uid() is not null);

create policy "Admins can manage categories" on public.categories
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Notifications table
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  ticket_id uuid references public.tickets(id) on delete cascade,
  type text not null check (type in ('ticket_created', 'ticket_updated', 'ticket_assigned', 'high_priority', 'ai_action_pending')),
  channel text not null default 'in_app' check (channel in ('in_app', 'email', 'slack')),
  title text not null,
  body text,
  read boolean not null default false,
  delivered boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users see own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Service role can insert notifications" on public.notifications
  for insert with check (true);

create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

-- tickets.category remains a text column for backward compatibility and should map to categories.name at the app level.

-- Seed default categories
insert into public.categories (name, description) values
  ('billing', 'Issues related to payments and invoices'),
  ('authentication', 'Login, password, and access issues'),
  ('technical', 'Technical errors and bugs'),
  ('general', 'General inquiries')
on conflict (name) do nothing;
