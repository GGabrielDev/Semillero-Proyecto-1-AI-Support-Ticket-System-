'use client';

import { Badge } from '@/components/ui/Badge';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { TicketStatus } from '@/types/ticket';

const statusClasses: Record<TicketStatus, string> = {
  open: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  in_progress: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  resolved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  closed: 'border-slate-600 bg-slate-800 text-slate-300',
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const { t } = useI18n();
  return <Badge className={statusClasses[status]}>{t(`common.status.${status}`)}</Badge>;
}
