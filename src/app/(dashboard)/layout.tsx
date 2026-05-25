import { redirect } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { createClient } from '@/lib/supabase/server';
import type { AppUser } from '@/types/user';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data } = await supabase
    .from('profiles')
    .select('email, full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  const profile = (data as Pick<AppUser, 'email' | 'full_name' | 'role'> | null) ?? null;

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar role={profile?.role ?? 'user'} />
      <div className="min-h-screen flex-1">
        <Header email={profile?.email ?? user.email ?? 'user@example.com'} fullName={profile?.full_name} />
        <main className="mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
