import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthContext, isAgentOrAdmin } from '@/lib/auth';
import { CreateCommentSchema } from '@/lib/validations';
import type { TicketComment } from '@/types/ticket';

const ParamsSchema = z.object({
  id: z.string().uuid('Invalid ticket id.'),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = ParamsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: params.error.flatten() }, { status: 400 });
  }

  const { supabase, user, profile } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = CreateCommentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: ticketRow, error: ticketError } = await supabase
    .from('tickets')
    .select('id, created_by')
    .eq('id', params.data.id)
    .maybeSingle();

  if (ticketError) {
    return NextResponse.json({ error: ticketError.message }, { status: 500 });
  }

  if (!ticketRow) {
    return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
  }

  const canManage = isAgentOrAdmin(profile?.role);
  const canComment = ticketRow.created_by === user.id || canManage;

  if (!canComment) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (parsed.data.is_internal && !canManage) {
    return NextResponse.json({ error: 'Only agents and admins can add internal notes.' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('ticket_comments')
    .insert({
      ticket_id: params.data.id,
      author_id: user.id,
      content: parsed.data.content,
      is_internal: canManage ? parsed.data.is_internal : false,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comment: data as TicketComment }, { status: 201 });
}
