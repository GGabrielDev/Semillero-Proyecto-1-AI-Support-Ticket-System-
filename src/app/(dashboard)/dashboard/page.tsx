import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TicketList } from '@/components/tickets/TicketList';
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge';
import { Badge } from '@/components/ui/Badge';
import { getAuthContext, isAgentOrAdmin } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { getRequestTranslator } from '@/lib/i18n/server';
import type { Ticket, TicketPriority, TicketStatus } from '@/types/ticket';

const statuses: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
const priorities: TicketPriority[] = ['low', 'medium', 'high', 'critical'];

const priorityClasses: Record<TicketPriority, string> = {
  low: 'border-slate-600 bg-slate-800 text-slate-200',
  medium: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200',
  high: 'border-orange-500/30 bg-orange-500/10 text-orange-200',
  critical: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
};

export default async function DashboardPage() {
  const { supabase, user, profile } = await getAuthContext();

  if (!user) {
    return null;
  }

  const isAgent = isAgentOrAdmin(profile?.role);

  if (!isAgent) {
    redirect('/tickets');
  }

  const { t, locale } = await getRequestTranslator();

  const getCategoryLabel = (category?: string | null) => {
    if (!category) return t('common.category.general');
    const key = `common.category.${category.toLowerCase()}`;
    const translation = t(key);
    return translation === key ? category : translation;
  };

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [recentTicketsResult, ...countResults] = await Promise.all([
    supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(6),
    ...statuses.map((status) => supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', status)),
    ...priorities.map((priority) => supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('priority', priority)),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).gte('resolved_at', sevenDaysAgo),
  ]);

  const tickets = (recentTicketsResult.data ?? []) as Ticket[];
  const statusCounts = statuses.reduce<Record<TicketStatus, number>>((accumulator, status, index) => {
    accumulator[status] = countResults[index]?.count ?? 0;
    return accumulator;
  }, { open: 0, in_progress: 0, resolved: 0, closed: 0 });
  const priorityOffset = statuses.length;
  const priorityCounts = priorities.reduce<Record<TicketPriority, number>>((accumulator, priority, index) => {
    accumulator[priority] = countResults[priorityOffset + index]?.count ?? 0;
    return accumulator;
  }, { low: 0, medium: 0, high: 0, critical: 0 });
  const velocity = countResults[priorityOffset + priorities.length]?.count ?? 0;

  // Agent priority queue: active tickets ordered by priority_order ASC (critical first)
  const agentQueueResult = isAgent
    ? await supabase
        .from('tickets')
        .select('*')
        .in('status', ['open', 'in_progress'])
        .order('priority_order', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(10)
    : null;
  const agentQueue = (agentQueueResult?.data ?? []) as Ticket[];

  // Manager metrics: avg resolution time + resolved-by-agent breakdown
  const resolvedResult = await supabase
    .from('tickets')
    .select('created_at, resolved_at, assigned_to')
    .in('status', ['resolved', 'closed'])
    .gte('resolved_at', thirtyDaysAgo)
    .not('resolved_at', 'is', null);

  const resolvedTickets = resolvedResult.data ?? [];

  let avgResolutionHours: number | null = null;
  if (resolvedTickets.length > 0) {
    const totalMs = resolvedTickets.reduce((sum, t) => {
      const diff = new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime();
      return sum + diff;
    }, 0);
    avgResolutionHours = Math.round(totalMs / resolvedTickets.length / (1000 * 60 * 60) * 10) / 10;
  }

  // Tickets resolved per agent in last 30 days
  const agentResolutionMap = resolvedTickets.reduce<Record<string, number>>((map, t) => {
    const key = t.assigned_to ?? 'unassigned';
    map[key] = (map[key] ?? 0) + 1;
    return map;
  }, {});

  const topAgentEntries = Object.entries(agentResolutionMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">{t('dashboard.title')}</h1>
          <p className="mt-2 text-sm text-slate-400">{t('dashboard.subtitle')}</p>
        </div>
        {profile?.role === 'admin' ? (
          <Link href="/tickets/new">
            <Button>{t('dashboard.createTicket')}</Button>
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <p className="text-sm text-slate-400">{t('dashboard.open')}</p>
          <p className="mt-3 text-4xl font-semibold text-white">{statusCounts.open}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">{t('dashboard.inProgress')}</p>
          <p className="mt-3 text-4xl font-semibold text-white">{statusCounts.in_progress}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">{t('dashboard.resolved')}</p>
          <p className="mt-3 text-4xl font-semibold text-white">{statusCounts.resolved}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">{t('dashboard.closed')}</p>
          <p className="mt-3 text-4xl font-semibold text-white">{statusCounts.closed}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">{t('dashboard.resolvedSevenDays')}</p>
          <p className="mt-3 text-4xl font-semibold text-white">{velocity}</p>
        </Card>
      </div>

      <Card className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">{t('dashboard.byPriority')}</h2>
          <p className="mt-1 text-sm text-slate-400">{t('dashboard.byPrioritySubtitle')}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-slate-400">{t('common.priority.low')}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{priorityCounts.low}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">{t('common.priority.medium')}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{priorityCounts.medium}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">{t('common.priority.high')}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{priorityCounts.high}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">{t('common.priority.critical')}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{priorityCounts.critical}</p>
          </div>
        </div>
      </Card>

      {isAgent && agentQueue.length > 0 ? (
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">{t('dashboard.agentQueue')}</h2>
              <p className="mt-1 text-sm text-slate-400">{t('dashboard.agentQueueSubtitle')}</p>
            </div>
            <Link className="text-sm text-sky-300 hover:text-sky-200" href="/tickets?status=open">
              {t('dashboard.viewAllActive')}
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="pb-3 pr-4 font-medium">{t('dashboard.tableTitle')}</th>
                  <th className="pb-3 pr-4 font-medium">{t('dashboard.tablePriority')}</th>
                  <th className="pb-3 pr-4 font-medium">{t('dashboard.tableStatus')}</th>
                  <th className="pb-3 pr-4 font-medium">{t('dashboard.tableCategory')}</th>
                  <th className="pb-3 font-medium">{t('dashboard.tableUpdated')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {agentQueue.map((ticket) => (
                  <tr key={ticket.id} className="transition hover:bg-slate-900/50">
                    <td className="py-3 pr-4">
                      <Link className="font-medium text-white hover:text-sky-300" href={`/tickets/${ticket.id}`}>
                        {ticket.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge className={priorityClasses[ticket.priority]}>{t(`common.priority.${ticket.priority}`)}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <TicketStatusBadge status={ticket.status} />
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{getCategoryLabel(ticket.category)}</td>
                    <td className="py-3 text-slate-400">{formatDate(ticket.updated_at, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {isAgent ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-white">{t('dashboard.avgResolutionTime')}</h2>
              <p className="mt-1 text-sm text-slate-400">{t('dashboard.avgResolutionTimeSubtitle')}</p>
            </div>
            <p className="text-4xl font-semibold text-white">
              {avgResolutionHours !== null ? `${avgResolutionHours}h` : '—'}
            </p>
            <p className="text-sm text-slate-500">{t('dashboard.resolvedCount', { count: resolvedTickets.length })}</p>
          </Card>

          {topAgentEntries.length > 0 ? (
            <Card className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{t('dashboard.resolvedByAgent')}</h2>
                <p className="mt-1 text-sm text-slate-400">{t('dashboard.resolvedByAgentSubtitle')}</p>
              </div>
              <ul className="space-y-2">
                {topAgentEntries.map(([agentId, count]) => (
                  <li key={agentId} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 font-mono text-xs truncate max-w-[200px]">
                      {agentId === 'unassigned' ? t('dashboard.unassigned') : agentId}
                    </span>
                    <span className="font-semibold text-white">{count}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">{t('dashboard.recentTickets')}</h2>
          <Link className="text-sm text-sky-300 hover:text-sky-200" href="/tickets">
            {t('dashboard.viewAll')}
          </Link>
        </div>
        <TicketList tickets={tickets} />
      </section>
    </div>
  );
}
