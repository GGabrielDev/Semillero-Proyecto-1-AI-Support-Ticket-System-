import { NextResponse } from 'next/server';
import { z } from 'zod';

import { persistTicketReplySuggestion } from '@/lib/ai/service';
import { suggestReply } from '@/lib/ai/provider';
import { createClient } from '@/lib/supabase/server';
import type { Ticket } from '@/types/ticket';

const SuggestSchema = z
  .object({
    ticketId: z.string().uuid().optional(),
    title: z.string().min(5).optional(),
    description: z.string().min(20).optional(),
    comments: z.array(z.string()).default([]),
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
  const parsed = SuggestSchema.safeParse(body);

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

      let comments = parsed.data.comments;
      if (!comments.length) {
        const { data: commentRows } = await supabase
          .from('ticket_comments')
          .select('content')
          .eq('ticket_id', ticket.id)
          .order('created_at', { ascending: true });
        comments = ((commentRows ?? []) as Array<{ content: string }>).map((comment) => comment.content);
      }

      const suggestion = await persistTicketReplySuggestion(ticket.id, ticket.title, ticket.description, comments);
      return NextResponse.json({ suggestion });
    }

    const suggestion = await suggestReply(
      parsed.data.title!,
      parsed.data.description!,
      parsed.data.comments,
    );

    return NextResponse.json({ suggestion });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to generate suggestion.' },
      { status: 500 },
    );
  }
}
