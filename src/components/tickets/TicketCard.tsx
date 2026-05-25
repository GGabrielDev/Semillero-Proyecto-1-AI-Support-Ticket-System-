import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge';
import { excerpt, formatDate, getPriorityLabel } from '@/lib/utils';
import type { Ticket } from '@/types/ticket';

const priorityClasses = {
  low: 'border-slate-600 bg-slate-800 text-slate-200',
  medium: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200',
  high: 'border-orange-500/30 bg-orange-500/10 text-orange-200',
  critical: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
};

export function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <Link href={`/tickets/${ticket.id}`}>
      <Card className="space-y-4 transition hover:border-sky-500/50 hover:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{ticket.title}</h3>
            <p className="mt-1 text-sm text-slate-400">{excerpt(ticket.description)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TicketStatusBadge status={ticket.status} />
            <Badge className={priorityClasses[ticket.priority]}>{getPriorityLabel(ticket.priority)}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>{ticket.category || 'General'}</span>
          <span>Updated {formatDate(ticket.updated_at)}</span>
        </div>
      </Card>
    </Link>
  );
}
