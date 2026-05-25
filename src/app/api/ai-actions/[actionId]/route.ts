import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthContext, isAgentOrAdmin } from '@/lib/auth';
import { triggerN8nWorkflow } from '@/lib/n8n';
import { PendingAiActionDecisionSchema } from '@/lib/validations';
import type { Database } from '@/types/database.types';
import type { AiPendingAction, Ticket } from '@/types/ticket';

const ParamsSchema = z.object({
  actionId: z.string().uuid('Invalid action id.'),
});

export async function PATCH(request: Request, context: { params: Promise<{ actionId: string }> }) {
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
  const parsed = PendingAiActionDecisionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: actionRow, error: actionError } = await supabase
    .from('ai_pending_actions')
    .select('*')
    .eq('id', params.data.actionId)
    .maybeSingle();

  if (actionError) {
    return NextResponse.json({ error: actionError.message }, { status: 500 });
  }

  const action = (actionRow as AiPendingAction | null) ?? null;

  if (!action) {
    return NextResponse.json({ error: 'Pending action not found.' }, { status: 404 });
  }

  if (action.status !== 'pending') {
    return NextResponse.json({ error: 'Pending action was already decided.' }, { status: 400 });
  }

  let ticket: Ticket | null = null;

  if (parsed.data.decision === 'approved') {
    const ticketUpdates: Database['public']['Tables']['tickets']['Update'] = {
      updated_at: new Date().toISOString(),
    };

    switch (action.action_type) {
      case 'close':
        ticketUpdates.status = 'closed';
        ticketUpdates.resolved_at = new Date().toISOString();
        break;
      case 'escalate':
        ticketUpdates.status = 'in_progress';
        ticketUpdates.priority = 'critical';
        break;
      case 'assign':
        ticketUpdates.status = 'in_progress';
        ticketUpdates.assigned_to = user.id;
        break;
      case 'request_info':
        ticketUpdates.status = 'in_progress';
        break;
      default:
        break;
    }

    const { data: updatedTicket, error: ticketError } = await supabase
      .from('tickets')
      .update(ticketUpdates)
      .eq('id', action.ticket_id)
      .select('*')
      .single();

    if (ticketError) {
      return NextResponse.json({ error: ticketError.message }, { status: 500 });
    }

    ticket = updatedTicket as Ticket;
  }

  const { data: updatedAction, error: updateError } = await supabase
    .from('ai_pending_actions')
    .update({
      status: parsed.data.decision,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq('id', action.id)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  void triggerN8nWorkflow('ai_action_decided', {
    actionId: action.id,
    ticketId: action.ticket_id,
    actionType: action.action_type,
    decision: parsed.data.decision,
    decidedBy: user.id,
  });

  return NextResponse.json({
    action: updatedAction as AiPendingAction,
    ticket,
  });
}
