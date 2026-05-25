import { NextResponse } from 'next/server';

import { persistTicketAnalysis } from '@/lib/ai/service';
import { triggerN8nWorkflow } from '@/lib/n8n';
import { createClient } from '@/lib/supabase/server';
import { CreateTicketSchema, TicketPrioritySchema, TicketStatusSchema } from '@/lib/validations';
import { toSearchPattern } from '@/lib/utils';
import type { Ticket } from '@/types/ticket';

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? '10');
  const statusParam = searchParams.get('status');
  const priorityParam = searchParams.get('priority');
  const q = searchParams.get('q');

  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
  const safePageSize = Number.isNaN(pageSize) || pageSize < 1 ? 10 : Math.min(pageSize, 50);
  const status = TicketStatusSchema.safeParse(statusParam);
  const priority = TicketPrioritySchema.safeParse(priorityParam);

  let query = supabase
    .from('tickets')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((safePage - 1) * safePageSize, safePage * safePageSize - 1);

  if (status.success) {
    query = query.eq('status', status.data);
  }

  if (priority.success) {
    query = query.eq('priority', priority.data);
  }

  const searchPattern = toSearchPattern(q);
  if (searchPattern) {
    query = query.or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: data,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total: count ?? 0,
    },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = CreateTicketSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category || null,
      created_by: user.id,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ticket = data as Ticket;

  void triggerN8nWorkflow('ticket_created', {
    ticketId: ticket.id,
    title: ticket.title,
    priority: ticket.priority,
    createdBy: ticket.created_by ?? user.id,
  });

  void persistTicketAnalysis(ticket.id, ticket.title, ticket.description).catch((caughtError) => {
    console.error('AI analysis failed after ticket creation:', caughtError);
  });

  return NextResponse.json({ ticket }, { status: 201 });
}
