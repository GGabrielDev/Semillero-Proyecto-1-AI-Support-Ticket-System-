import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TicketList } from '@/components/tickets/TicketList';
import { createClient } from '@/lib/supabase/server';
import type { Ticket } from '@/types/ticket';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(6);

  const tickets = (data ?? []) as Ticket[];
  const stats = {
    open: tickets.filter((ticket) => ticket.status === 'open').length,
    in_progress: tickets.filter((ticket) => ticket.status === 'in_progress').length,
    resolved: tickets.filter((ticket) => ticket.status === 'resolved').length,
  };

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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-400">Open</p>
          <p className="mt-3 text-4xl font-semibold text-white">{stats.open}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">In progress</p>
          <p className="mt-3 text-4xl font-semibold text-white">{stats.in_progress}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Resolved</p>
          <p className="mt-3 text-4xl font-semibold text-white">{stats.resolved}</p>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">Recent tickets</h2>
          <Link className="text-sm text-sky-300 hover:text-sky-200" href="/tickets">
            View all
          </Link>
        </div>
        <TicketList tickets={tickets as Ticket[]} />
      </section>
    </div>
  );
}
