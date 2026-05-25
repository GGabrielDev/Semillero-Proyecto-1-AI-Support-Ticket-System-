import Link from 'next/link';

import { TicketList } from '@/components/tickets/TicketList';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/server';
import { TicketPrioritySchema, TicketStatusSchema } from '@/lib/validations';
import { toSearchPattern } from '@/lib/utils';
import type { Ticket } from '@/types/ticket';

type TicketsPageProps = {
  searchParams: {
    page?: string;
    status?: string;
    priority?: string;
    q?: string;
  };
};

const PAGE_SIZE = 10;

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const page = Number(searchParams.page ?? '1');
  const currentPage = Number.isNaN(page) || page < 1 ? 1 : page;
  const statusResult = TicketStatusSchema.safeParse(searchParams.status);
  const priorityResult = TicketPrioritySchema.safeParse(searchParams.priority);
  const status = statusResult.success ? statusResult.data : undefined;
  const priority = priorityResult.success ? priorityResult.data : undefined;
  const q = searchParams.q?.trim() || '';

  const supabase = createClient();
  let query = supabase
    .from('tickets')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (priority) {
    query = query.eq('priority', priority);
  }

  const searchPattern = toSearchPattern(q);
  if (searchPattern) {
    query = query.or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`);
  }

  const { data, count } = await query;
  const tickets = (data ?? []) as Ticket[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Tickets</h1>
          <p className="mt-2 text-sm text-slate-400">Filter issues by state, priority, and free-text search.</p>
        </div>
        <Link href="/tickets/new">
          <Button>Create ticket</Button>
        </Link>
      </div>

      <Card>
        <form className="grid gap-4 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-end" method="GET">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="q">
              Search
            </label>
            <Input defaultValue={q} id="q" name="q" placeholder="Search title or description" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="status">
              Status
            </label>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              defaultValue={status ?? ''}
              id="status"
              name="status"
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="priority">
              Priority
            </label>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              defaultValue={priority ?? ''}
              id="priority"
              name="priority"
            >
              <option value="">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <Button type="submit">Apply filters</Button>
        </form>
      </Card>

      <TicketList tickets={tickets as Ticket[]} />

      <div className="flex items-center justify-between gap-4 text-sm text-slate-400">
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex gap-3">
          <Link
            className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'text-sky-300 hover:text-sky-200'}
            href={{
              pathname: '/tickets',
              query: { ...searchParams, page: String(Math.max(1, currentPage - 1)) },
            }}
          >
            Previous
          </Link>
          <Link
            className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'text-sky-300 hover:text-sky-200'}
            href={{
              pathname: '/tickets',
              query: { ...searchParams, page: String(Math.min(totalPages, currentPage + 1)) },
            }}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
