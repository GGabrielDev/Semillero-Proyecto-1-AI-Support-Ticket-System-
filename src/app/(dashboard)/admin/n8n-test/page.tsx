import { redirect } from 'next/navigation';

import { N8nTestManager } from '@/components/admin/N8nTestManager';
import { getAuthContext, isAdmin } from '@/lib/auth';

export default async function AdminN8nTestPage() {
  const { user, profile } = await getAuthContext();

  if (!user) {
    redirect('/login');
  }

  if (!isAdmin(profile?.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">n8n Integration Testing Suite</h1>
        <p className="mt-2 text-sm text-slate-400">
          Trigger mock ticket events, AI actions, and summary updates to test and debug your n8n workflows directly.
        </p>
      </div>

      <N8nTestManager />
    </div>
  );
}
