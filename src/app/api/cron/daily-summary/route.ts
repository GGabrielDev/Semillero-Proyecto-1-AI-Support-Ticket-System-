import { NextResponse } from 'next/server';

import { triggerN8nWorkflow } from '@/lib/n8n';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Ticket } from '@/types/ticket';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  if (!admin) {
    return NextResponse.json({ error: 'Admin client is not configured.' }, { status: 500 });
  }

  const { data, error } = await admin
    .from('tickets')
    .select('id, title, status, priority, ai_summary')
    .in('status', ['open', 'in_progress'])
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tickets = (data ?? []) as Array<Pick<Ticket, 'id' | 'title' | 'status' | 'priority' | 'ai_summary'>>;
  const statusCounts = tickets.reduce<Record<'open' | 'in_progress', number>>(
    (accumulator, ticket) => {
      if (ticket.status === 'open' || ticket.status === 'in_progress') {
        accumulator[ticket.status] += 1;
      }
      return accumulator;
    },
    { open: 0, in_progress: 0 },
  );

  await triggerN8nWorkflow('daily_summary', {
    totalOpenTickets: tickets.length,
    statusCounts,
    tickets: tickets.map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      summary: ticket.ai_summary,
    })),
    lifecycleStatus: 'daily_summary_generated',
    correlationId: `daily_summary_${new Date().toISOString().slice(0, 10)}`,
  });

  return NextResponse.json({
    received: true,
    totalOpenTickets: tickets.length,
    statusCounts,
  });
}
