import { redirect } from 'next/navigation';

import { UserRoleTable } from '@/components/admin/UserRoleTable';
import { Card } from '@/components/ui/Card';
import { getAuthContext, isAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestTranslator } from '@/lib/i18n/server';
import type { AppUser } from '@/types/user';

export default async function AdminUsersPage() {
  const { supabase, user, profile } = await getAuthContext();

  if (!user) {
    redirect('/login');
  }

  if (!isAdmin(profile?.role)) {
    redirect('/dashboard');
  }

  const admin = createAdminClient();
  const profilesClient = admin ?? supabase;
  const { data, error } = await profilesClient
    .from('profiles')
    .select('id, email, full_name, role')
    .order('full_name', { ascending: true })
    .order('email', { ascending: true });

  if (error) {
    throw new Error(`Unable to load users: ${error.message}`);
  }

  const users = (data ?? []) as Array<Pick<AppUser, 'id' | 'email' | 'full_name' | 'role'>>;

  const { t } = await getRequestTranslator();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">{t('admin.usersTitle')}</h1>
        <p className="mt-2 text-sm text-slate-400">{t('admin.usersSubtitle')}</p>
      </div>

      <Card>
        <UserRoleTable currentUserId={user.id} users={users} />
      </Card>
    </div>
  );
}
