import Link from 'next/link';

import { TicketList } from '@/components/tickets/TicketList';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/server';
import { TicketPrioritySchema, TicketStatusSchema } from '@/lib/validations';
import { toSearchPattern } from '@/lib/utils';
import { getRequestTranslator } from '@/lib/i18n/server';
import type { Ticket } from '@/types/ticket';

type TicketsPageProps = {
  searchParams: Promise<{
    page?: string;
    status?: string;
    priority?: string;
    q?: string;
    sort?: string;
  }>;
};

const PAGE_SIZE = 10;

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page ?? '1');
  const currentPage = Number.isNaN(page) || page < 1 ? 1 : page;
  const statusResult = TicketStatusSchema.safeParse(resolvedSearchParams.status);
  const priorityResult = TicketPrioritySchema.safeParse(resolvedSearchParams.priority);
  const status = statusResult.success ? statusResult.data : undefined;
  const priority = priorityResult.success ? priorityResult.data : undefined;
  const q = resolvedSearchParams.q?.trim() || '';
  const sort = resolvedSearchParams.sort === 'priority' ? 'priority' : 'date';

  const supabase = await createClient();
  let query = supabase
    .from('tickets')
    .select('*', { count: 'exact' })
    .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

  if (sort === 'priority') {
    query = query
      .order('priority_order', { ascending: true })
      .order('created_at', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

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

  const { t } = await getRequestTranslator();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">{t('tickets.title')}</h1>
          <p className="mt-2 text-sm text-slate-400">{t('tickets.subtitle')}</p>
        </div>
        <Link href="/tickets/new">
          <Button>{t('tickets.createTicket')}</Button>
        </Link>
      </div>

      <Card>
        <form className="grid gap-4 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-end" method="GET">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="q">
              {t('tickets.search')}
            </label>
            <Input defaultValue={q} id="q" name="q" placeholder={t('tickets.searchPlaceholder')} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="status">
              {t('tickets.status')}
            </label>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              defaultValue={status ?? ''}
              id="status"
              name="status"
            >
              <option value="">{t('tickets.all')}</option>
              <option value="open">{t('common.status.open')}</option>
              <option value="in_progress">{t('common.status.in_progress')}</option>
              <option value="resolved">{t('common.status.resolved')}</option>
              <option value="closed">{t('common.status.closed')}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="priority">
              {t('tickets.priority')}
            </label>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              defaultValue={priority ?? ''}
              id="priority"
              name="priority"
            >
              <option value="">{t('tickets.all')}</option>
              <option value="low">{t('common.priority.low')}</option>
              <option value="medium">{t('common.priority.medium')}</option>
              <option value="high">{t('common.priority.high')}</option>
              <option value="critical">{t('common.priority.critical')}</option>
            </select>
          </div>

          <Button type="submit">{t('tickets.applyFilters')}</Button>
          <Link
            href={{
              pathname: '/tickets',
              query: {
                ...Object.fromEntries(
                  Object.entries(resolvedSearchParams).filter(([k]) => k !== 'sort'),
                ),
                sort: sort === 'priority' ? 'date' : 'priority',
              },
            }}
          >
            <Button type="button" variant="secondary">
              {sort === 'priority' ? t('tickets.sortPriority') : t('tickets.sortNewest')}
            </Button>
          </Link>
        </form>
      </Card>

      <TicketList tickets={tickets as Ticket[]} />

      <div className="flex items-center justify-between gap-4 text-sm text-slate-400">
        <span>
          {t('tickets.pageIndicator', { page: String(currentPage), totalPages: String(totalPages) })}
        </span>
        <div className="flex gap-3">
          <Link
            className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'text-sky-300 hover:text-sky-200'}
            href={{
              pathname: '/tickets',
              query: { ...resolvedSearchParams, page: String(Math.max(1, currentPage - 1)) },
            }}
          >
            {t('tickets.previous')}
          </Link>
          <Link
            className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'text-sky-300 hover:text-sky-200'}
            href={{
              pathname: '/tickets',
              query: { ...resolvedSearchParams, page: String(Math.min(totalPages, currentPage + 1)) },
            }}
          >
            {t('tickets.next')}
          </Link>
        </div>
      </div>
    </div>
  );
}
