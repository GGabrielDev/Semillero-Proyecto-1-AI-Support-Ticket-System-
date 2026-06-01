-- Migration to support database-driven AI configuration with fallback and active statuses
create table if not exists public.ai_configs (
  id uuid default uuid_generate_v4() primary key,
  provider text not null check (provider in ('google', 'llama', 'deepseek')),
  model_name text not null,
  api_key text, -- stored encrypted
  base_url text, -- optional base URL (e.g. for llama or customized deepseek)
  is_active boolean not null default false,
  fallback_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.ai_configs enable row level security;

-- Only admins should be able to view and manage AI configurations
create policy "Admins can manage AI configs" on public.ai_configs
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Trigger to update updated_at
create trigger update_ai_configs_updated_at before update on public.ai_configs
  for each row execute function update_updated_at_column();

-- Update ai_events check constraint to include deepseek
alter table public.ai_events drop constraint if exists ai_events_provider_check;
alter table public.ai_events add constraint ai_events_provider_check check (provider in ('google', 'llama', 'deepseek'));
