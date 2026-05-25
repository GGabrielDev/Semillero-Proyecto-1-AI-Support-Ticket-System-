import { redirect } from 'next/navigation';

import { UserRoleTable } from '@/components/admin/UserRoleTable';
import { Card } from '@/components/ui/Card';
import { getAuthContext, isAdmin } from '@/lib/auth';
import type { AppUser } from '@/types/user';

export default async function AdminUsersPage() {
  const { supabase, user, profile } = await getAuthContext();

  if (!user) {
    redirect('/login');
  }

  if (!isAdmin(profile?.role)) {
    redirect('/dashboard');
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .order('full_name', { ascending: true })
    .order('email', { ascending: true });

  const users = (data ?? []) as Array<Pick<AppUser, 'id' | 'email' | 'full_name' | 'role'>>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Admin users</h1>
        <p className="mt-2 text-sm text-slate-400">Manage team roles and grant agent or admin access.</p>
      </div>

      <Card>
        <UserRoleTable users={users} />
      </Card>
    </div>
  );
}
