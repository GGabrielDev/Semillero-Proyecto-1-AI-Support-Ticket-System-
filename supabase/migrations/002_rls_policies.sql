-- Enable RLS
alter table public.profiles enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.ai_events enable row level security;

-- Profiles: users see own profile, agents/admins see all
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Agents can view all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('agent', 'admin'))
  );

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Tickets: users see own tickets, agents/admins see all
create policy "Users can view own tickets" on public.tickets
  for select using (auth.uid() = created_by);

create policy "Agents can view all tickets" on public.tickets
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('agent', 'admin'))
  );

create policy "Users can create tickets" on public.tickets
  for insert with check (auth.uid() = created_by);

create policy "Users can update own tickets" on public.tickets
  for update using (auth.uid() = created_by);

create policy "Agents can update any ticket" on public.tickets
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('agent', 'admin'))
  );

-- Comments: follow ticket visibility
create policy "Users can view comments on own tickets" on public.ticket_comments
  for select using (
    exists (select 1 from public.tickets t where t.id = ticket_id and t.created_by = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('agent', 'admin'))
  );

create policy "Authenticated users can create comments" on public.ticket_comments
  for insert with check (auth.uid() = author_id);

-- AI events: agents/admins only
create policy "Agents can view ai events" on public.ai_events
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('agent', 'admin'))
  );

create policy "Service role can insert ai events" on public.ai_events
  for insert with check (true);
