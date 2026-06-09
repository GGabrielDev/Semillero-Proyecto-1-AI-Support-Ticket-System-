import { redirect } from 'next/navigation';

import { TicketForm } from '@/components/tickets/TicketForm';
import { Card } from '@/components/ui/Card';
import { getRequestTranslator } from '@/lib/i18n/server';
import { getAuthContext } from '@/lib/auth';

export default async function NewTicketPage() {
  const { user, profile } = await getAuthContext();

  if (!user) {
    redirect('/login');
  }

  // Operators/agents are not allowed to create tickets
  if (profile?.role === 'agent') {
    redirect('/tickets');
  }

  const { t } = await getRequestTranslator();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">{t('tickets.createTitle')}</h1>
        <p className="mt-2 text-sm text-slate-400">{t('tickets.createSubtitle')}</p>
      </div>
      <Card>
        <TicketForm />
      </Card>
    </div>
  );
}
