alter table public.ai_events
  add column if not exists prompt_text text,
  add column if not exists model_version text,
  add column if not exists result_json jsonb;

alter table public.tickets
  add column if not exists ai_analysis_json jsonb;

-- Tighten comment visibility so only agents/admins can see internal notes.
drop policy if exists "Users can view comments on own tickets" on public.ticket_comments;
create policy "Users can view comments on own tickets" on public.ticket_comments
  for select using (
    (
      not is_internal
      and exists (select 1 from public.tickets t where t.id = ticket_id and t.created_by = auth.uid())
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('agent', 'admin'))
  );

drop policy if exists "Authenticated users can create comments" on public.ticket_comments;
create policy "Authenticated users can create comments" on public.ticket_comments
  for insert with check (
    auth.uid() = author_id
    and (
      (
        not is_internal
        and exists (select 1 from public.tickets t where t.id = ticket_id and t.created_by = auth.uid())
      )
      or exists (select 1 from public.profiles where id = auth.uid() and role in ('agent', 'admin'))
    )
  );

create table if not exists public.ai_pending_actions (
  id uuid default uuid_generate_v4() primary key,
  ticket_id uuid references public.tickets(id) on delete cascade not null,
  action_type text not null check (action_type in ('escalate', 'close', 'assign', 'request_info')),
  ai_suggestion jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.ai_pending_actions enable row level security;

create policy "Agents can manage pending actions" on public.ai_pending_actions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('agent', 'admin'))
  );
