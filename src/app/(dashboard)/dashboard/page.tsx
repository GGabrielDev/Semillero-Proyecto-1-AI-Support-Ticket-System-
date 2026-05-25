import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TicketList } from '@/components/tickets/TicketList';
import { createClient } from '@/lib/supabase/server';
import type { Ticket, TicketPriority, TicketStatus } from '@/types/ticket';

const statuses: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
const priorities: TicketPriority[] = ['low', 'medium', 'high', 'critical'];

export default async function DashboardPage() {
  const supabase = await createClient();
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-400">Monitor workload, triage active issues, and review recent tickets.</p>
        </div>
        <Link href="/tickets/new">
          <Button>Create ticket</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <p className="text-sm text-slate-400">Open</p>
          <p className="mt-3 text-4xl font-semibold text-white">{statusCounts.open}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">In progress</p>
          <p className="mt-3 text-4xl font-semibold text-white">{statusCounts.in_progress}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Resolved</p>
          <p className="mt-3 text-4xl font-semibold text-white">{statusCounts.resolved}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Closed</p>
          <p className="mt-3 text-4xl font-semibold text-white">{statusCounts.closed}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Resolved (7d)</p>
          <p className="mt-3 text-4xl font-semibold text-white">{velocity}</p>
        </Card>
      </div>

      <Card className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">By Priority</h2>
          <p className="mt-1 text-sm text-slate-400">Current ticket distribution across all priority levels.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-slate-400">Low</p>
            <p className="mt-2 text-2xl font-semibold text-white">{priorityCounts.low}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Medium</p>
            <p className="mt-2 text-2xl font-semibold text-white">{priorityCounts.medium}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">High</p>
            <p className="mt-2 text-2xl font-semibold text-white">{priorityCounts.high}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Critical</p>
            <p className="mt-2 text-2xl font-semibold text-white">{priorityCounts.critical}</p>
          </div>
        </div>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">Recent tickets</h2>
          <Link className="text-sm text-sky-300 hover:text-sky-200" href="/tickets">
            View all
          </Link>
        </div>
        <TicketList tickets={tickets} />
      </section>
    </div>
  );
}
