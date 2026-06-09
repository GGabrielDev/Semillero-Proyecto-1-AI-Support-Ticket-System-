-- Drop old select policies on profiles
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Agents can view all profiles" on public.profiles;

-- Create new select policy allowing all authenticated users to view profiles
create policy "All authenticated users can view profiles" on public.profiles
  for select using (auth.uid() is not null);
