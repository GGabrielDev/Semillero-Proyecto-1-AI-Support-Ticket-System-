import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthContext, isAgentOrAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database.types';

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

type AiEventRow = Pick<
  Database['public']['Tables']['ai_events']['Row'],
  'ticket_id' | 'event_type' | 'provider' | 'latency_ms' | 'success' | 'model_version' | 'created_at'
>;

export async function GET(request: Request) {
  const { user, profile } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAgentOrAdmin(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    page: searchParams.get('page') ?? '1',
    pageSize: searchParams.get('pageSize') ?? '20',
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();

  if (!admin) {
    return NextResponse.json({ error: 'Admin client is not configured.' }, { status: 500 });
  }

  const from = (parsed.data.page - 1) * parsed.data.pageSize;
  const to = from + parsed.data.pageSize - 1;
  const { data, count, error } = await admin
    .from('ai_events')
    .select('ticket_id, event_type, provider, latency_ms, success, model_version, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: (data ?? []) as AiEventRow[],
    pagination: {
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      total: count ?? 0,
    },
  });
}
