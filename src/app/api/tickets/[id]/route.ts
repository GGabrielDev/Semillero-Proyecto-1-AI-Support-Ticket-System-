import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthContext, isAgentOrAdmin } from '@/lib/auth';
import { triggerN8nWorkflow } from '@/lib/n8n';
import { createNotification } from '@/lib/notifications';
import { createAdminClient } from '@/lib/supabase/admin';
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

  const updatedTicket = data as Ticket;

  // Trigger n8n when ticket status changes
  if (parsed.data.status) {
    const admin = createAdminClient();
    let creatorEmail: string | null = null;
    if (admin && updatedTicket.created_by) {
      const { data: creatorProfile } = await admin
        .from('profiles')
        .select('email')
        .eq('id', updatedTicket.created_by)
        .maybeSingle();
      creatorEmail = creatorProfile?.email ?? null;
    }

    void triggerN8nWorkflow('ticket_status_changed', {
      ticketId: updatedTicket.id,
      title: updatedTicket.title,
      status: updatedTicket.status,
      priority: updatedTicket.priority,
      updatedBy: user.id,
      creatorEmail,
      lifecycleStatus: 'ticket_status_changed',
      correlationId: updatedTicket.id,
      updatesEvent: 'ticket_created',
    });
  }

  // Notify the newly assigned agent
  if (parsed.data.assigned_to && parsed.data.assigned_to !== user.id) {
    void createNotification({
      userId: parsed.data.assigned_to,
      ticketId: updatedTicket.id,
      type: 'ticket_assigned',
      title: `Ticket assigned to you`,
      body: updatedTicket.title,
    });
  }

  return NextResponse.json({ ticket: updatedTicket });
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
