import { TicketForm } from '@/components/tickets/TicketForm';
import { Card } from '@/components/ui/Card';
import { getRequestTranslator } from '@/lib/i18n/server';

export default async function NewTicketPage() {
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
