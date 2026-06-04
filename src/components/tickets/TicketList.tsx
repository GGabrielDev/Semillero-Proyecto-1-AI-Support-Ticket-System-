'use client';

import { TicketCard } from '@/components/tickets/TicketCard';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { Ticket } from '@/types/ticket';

export function TicketList({ tickets }: { tickets: Ticket[] }) {
  const { t } = useI18n();

  if (!tickets.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center text-sm text-slate-400">
        {t('dashboard.noTicketsFound')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}
