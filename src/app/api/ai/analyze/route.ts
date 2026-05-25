import { NextResponse } from 'next/server';
import { z } from 'zod';

import { analyzeTicket } from '@/lib/ai/provider';
import { persistTicketAnalysis } from '@/lib/ai/service';
import { createClient } from '@/lib/supabase/server';
import type { Ticket } from '@/types/ticket';

const AnalyzeSchema = z
  .object({
    ticketId: z.string().uuid().optional(),
    title: z.string().min(5).optional(),
    description: z.string().min(20).optional(),
  })
  .refine((value) => Boolean(value.ticketId || (value.title && value.description)), {
    message: 'Provide a ticketId or title and description.',
  });

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = AnalyzeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (parsed.data.ticketId) {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, title, description')
        .eq('id', parsed.data.ticketId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const ticket = (data as Pick<Ticket, 'id' | 'title' | 'description'> | null) ?? null;

      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
      }

      const analysis = await persistTicketAnalysis(ticket.id, ticket.title, ticket.description);
      return NextResponse.json({ analysis });
    }

    const analysis = await analyzeTicket(parsed.data.title!, parsed.data.description!);
    return NextResponse.json({ analysis });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to analyze ticket.' },
      { status: 500 },
    );
  }
}
