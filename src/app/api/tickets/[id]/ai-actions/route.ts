import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthContext, isAgentOrAdmin } from '@/lib/auth';
import { CreatePendingAiActionSchema } from '@/lib/validations';
import type { Json } from '@/types/database.types';
import type { AiPendingAction } from '@/types/ticket';

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

  if (!isAgentOrAdmin(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('ai_pending_actions')
    .select('*')
    .eq('ticket_id', params.data.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ actions: (data ?? []) as AiPendingAction[] });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
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
  const parsed = CreatePendingAiActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: ticketRow, error: ticketError } = await supabase
    .from('tickets')
    .select('id')
    .eq('id', params.data.id)
    .maybeSingle();

  if (ticketError) {
    return NextResponse.json({ error: ticketError.message }, { status: 500 });
  }

  if (!ticketRow) {
    return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from('ai_pending_actions')
    .select('*')
    .eq('ticket_id', params.data.id)
    .eq('action_type', parsed.data.actionType)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ action: existing as AiPendingAction });
  }

  const { data, error } = await supabase
    .from('ai_pending_actions')
    .insert({
      ticket_id: params.data.id,
      action_type: parsed.data.actionType,
      ai_suggestion: parsed.data.aiSuggestion as Json,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ action: data as AiPendingAction }, { status: 201 });
}
