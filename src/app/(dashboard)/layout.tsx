import { redirect } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { getAuthContext } from '@/lib/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getAuthContext();

  if (!user) {
    redirect('/login');
  }

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
