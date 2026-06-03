import { redirect } from 'next/navigation';

import { AiConfigManager } from '@/components/admin/AiConfigManager';
import { getAuthContext, isAdmin } from '@/lib/auth';

export default async function AdminAiConfigPage() {
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
        <h1 className="text-3xl font-semibold text-white">AI Engine Configuration</h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage AI engines, configure fallback queues, and update secure API keys dynamically.
        </p>
      </div>

      <AiConfigManager />
    </div>
  );
}
