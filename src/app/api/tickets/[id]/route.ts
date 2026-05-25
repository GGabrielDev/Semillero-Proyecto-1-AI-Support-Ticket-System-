import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthContext, isAgentOrAdmin } from '@/lib/auth';
import { UpdateTicketSchema } from '@/lib/validations';
import type { Ticket } from '@/types/ticket';

const ParamsSchema = z.object({
  id: z.string().uuid('Invalid ticket id.'),
});

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = ParamsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: params.error.flatten() }, { status: 400 });
  }

  const { supabase, user, profile } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase.from('tickets').select('*').eq('id', params.data.id).maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ticket = (data as Ticket | null) ?? null;

  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
  }

  let commentsQuery = supabase
    .from('ticket_comments')
    .select('*')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: true });

  if (!isAgentOrAdmin(profile?.role)) {
    commentsQuery = commentsQuery.eq('is_internal', false);
  }

  const { data: commentsData, error: commentsError } = await commentsQuery;
  const comments = commentsData ?? [];

  if (commentsError) {
    return NextResponse.json({ error: commentsError.message }, { status: 500 });
  }

  return NextResponse.json({ ticket, comments });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = ParamsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: params.error.flatten() }, { status: 400 });
  }

  const { supabase, user, profile } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAgentOrAdmin(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = UpdateTicketSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates = {
    ...parsed.data,
    ...(parsed.data.status
      ? { resolved_at: ['resolved', 'closed'].includes(parsed.data.status) ? new Date().toISOString() : null }
      : {}),
  };

  const { data, error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', params.data.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ticket: data as Ticket });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = ParamsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: params.error.flatten() }, { status: 400 });
  }

  const { supabase, user, profile } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAgentOrAdmin(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('tickets')
    .update({
      status: 'closed',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', params.data.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ticket: data as Ticket });
}
