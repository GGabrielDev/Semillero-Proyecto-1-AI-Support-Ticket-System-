import { TicketCard } from '@/components/tickets/TicketCard';
import type { Ticket } from '@/types/ticket';

export function TicketList({ tickets }: { tickets: Ticket[] }) {
  if (!tickets.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center text-sm text-slate-400">
        No tickets found for the selected filters.
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
