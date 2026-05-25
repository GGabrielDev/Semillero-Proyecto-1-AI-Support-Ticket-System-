import { analyzeTicket, getAiProviderName, suggestReply } from '@/lib/ai/provider';
import { createAdminClient } from '@/lib/supabase/admin';

async function logAiEvent(input: {
  ticketId?: string;
  eventType: 'analyze' | 'suggest_reply' | 'prioritize';
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
}) {
  const admin = createAdminClient();

  if (!admin) {
    return;
  }

  await admin.from('ai_events').insert({
    ticket_id: input.ticketId ?? null,
    event_type: input.eventType,
    provider: getAiProviderName(),
    latency_ms: input.latencyMs,
    success: input.success,
    error_message: input.errorMessage ?? null,
  });
}

export async function persistTicketAnalysis(ticketId: string, title: string, description: string) {
  const startedAt = Date.now();

  try {
    const result = await analyzeTicket(title, description);
    const admin = createAdminClient();

    if (admin) {
      await admin
        .from('tickets')
        .update({
          ai_summary: result.summary,
          ai_suggested_priority: result.priority,
        })
        .eq('id', ticketId);
    }

    await logAiEvent({
      ticketId,
      eventType: 'analyze',
      latencyMs: Date.now() - startedAt,
      success: true,
    });

    return result;
  } catch (error) {
    await logAiEvent({
      ticketId,
      eventType: 'analyze',
      latencyMs: Date.now() - startedAt,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown AI analysis error.',
    });

    throw error;
  }
}

export async function persistTicketReplySuggestion(
  ticketId: string,
  title: string,
  description: string,
  comments: string[],
) {
  const startedAt = Date.now();

  try {
    const suggestion = await suggestReply(title, description, comments);
    const admin = createAdminClient();

    if (admin) {
      await admin
        .from('tickets')
        .update({
          ai_suggested_reply: suggestion,
        })
        .eq('id', ticketId);
    }

    await logAiEvent({
      ticketId,
      eventType: 'suggest_reply',
      latencyMs: Date.now() - startedAt,
      success: true,
    });

    return suggestion;
  } catch (error) {
    await logAiEvent({
      ticketId,
      eventType: 'suggest_reply',
      latencyMs: Date.now() - startedAt,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown AI suggestion error.',
    });

    throw error;
  }
}
