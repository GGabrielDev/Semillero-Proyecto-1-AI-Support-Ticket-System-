import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { getAuthContext, isAgentOrAdmin } from '@/lib/auth';
import { capitalizeWords, formatDate } from '@/lib/utils';
import { getRequestTranslator } from '@/lib/i18n/server';
import type { Database } from '@/types/database.types';

type AiEventRow = Pick<
  Database['public']['Tables']['ai_events']['Row'],
  'ticket_id' | 'event_type' | 'provider' | 'latency_ms' | 'success' | 'model_version' | 'created_at'
>;

type AiEventsPageProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

const PAGE_SIZE = 20;

export default async function AiEventsPage({ searchParams }: AiEventsPageProps) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page ?? '1');
  const currentPage = Number.isNaN(page) || page < 1 ? 1 : page;
  const { supabase, user, profile } = await getAuthContext();

  if (!user) {
    redirect('/login');
  }

  if (!isAgentOrAdmin(profile?.role)) {
    redirect('/dashboard');
  }

  const { data, count } = await supabase
    .from('ai_events')
    .select('ticket_id, event_type, provider, latency_ms, success, model_version, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

  const events = (data ?? []) as AiEventRow[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const { t, locale } = await getRequestTranslator();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">{t('admin.aiEventsTitle')}</h1>
        <p className="mt-2 text-sm text-slate-400">{t('admin.aiEventsSubtitle')}</p>
      </div>

      <Card>
        {events.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="pb-3 pr-4 font-medium">{t('admin.created')}</th>
                  <th className="pb-3 pr-4 font-medium">{t('admin.type')}</th>
                  <th className="pb-3 pr-4 font-medium">{t('admin.ticket')}</th>
                  <th className="pb-3 pr-4 font-medium">{t('admin.provider')}</th>
                  <th className="pb-3 pr-4 font-medium">{t('admin.model')}</th>
                  <th className="pb-3 pr-4 font-medium">{t('admin.latency')}</th>
                  <th className="pb-3 font-medium">{t('admin.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {events.map((event) => (
                  <tr key={`${event.created_at}-${event.ticket_id}-${event.event_type}`}>
                    <td className="py-4 pr-4 text-slate-400">{formatDate(event.created_at, locale)}</td>
                    <td className="py-4 pr-4">{capitalizeWords(event.event_type)}</td>
                    <td className="py-4 pr-4 text-slate-400">{event.ticket_id ?? '—'}</td>
                    <td className="py-4 pr-4">{event.provider}</td>
                    <td className="py-4 pr-4 text-slate-400">{event.model_version ?? '—'}</td>
                    <td className="py-4 pr-4">{event.latency_ms ? `${event.latency_ms} ms` : '—'}</td>
                    <td className="py-4">
                      <Badge className={event.success ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}>
                        {event.success ? t('admin.success') : t('admin.failed')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400">{t('admin.noAiEvents')}</p>
        )}
      </Card>

      <div className="flex items-center justify-between gap-4 text-sm text-slate-400">
        <span>
          {t('tickets.pageIndicator', { page: String(currentPage), totalPages: String(totalPages) })}
        </span>
        <div className="flex gap-3">
          <Link
            className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'text-sky-300 hover:text-sky-200'}
            href={{
              pathname: '/admin/ai-events',
              query: { ...resolvedSearchParams, page: String(Math.max(1, currentPage - 1)) },
            }}
          >
            {t('tickets.previous')}
          </Link>
          <Link
            className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'text-sky-300 hover:text-sky-200'}
            href={{
              pathname: '/admin/ai-events',
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
