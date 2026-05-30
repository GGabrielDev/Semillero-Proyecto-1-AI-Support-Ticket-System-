import { analyzeTicket, getAiProviderName, suggestReply } from '@/lib/ai/provider';
import { triggerN8nWorkflow } from '@/lib/n8n';
import { createNotificationsForAgents } from '@/lib/notifications';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database.types';

async function logAiEvent(input: {
  ticketId?: string;
  eventType: 'analyze' | 'suggest_reply' | 'prioritize';
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  promptText?: string;
  modelVersion?: string;
  resultJson?: Json;
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
    prompt_text: input.promptText ?? null,
    model_version: input.modelVersion ?? null,
    result_json: input.resultJson ?? null,
  });
}

export async function persistTicketAnalysis(ticketId: string, title: string, description: string) {
  const startedAt = Date.now();

  try {
    const analysis = await analyzeTicket(title, description);
    const admin = createAdminClient();

    if (admin) {
      await admin
        .from('tickets')
        .update({
          ai_summary: analysis.result.summary,
          ai_suggested_priority: analysis.result.classification.priority,
          ai_analysis_json: analysis.result as unknown as Json,
        })
        .eq('id', ticketId);
    }

    await logAiEvent({
      ticketId,
      eventType: 'analyze',
      latencyMs: Date.now() - startedAt,
      success: true,
      promptText: analysis.promptText,
      modelVersion: analysis.modelVersion,
      resultJson: analysis.result as unknown as Json,
    });

    if (analysis.result.classification.priority === 'high' || analysis.result.classification.priority === 'critical') {
      await triggerN8nWorkflow('high_priority_ticket', {
        ticketId,
        priority: analysis.result.classification.priority,
        riskLevel: analysis.result.riskLevel,
        summary: analysis.result.summary,
        lifecycleStatus: 'high_priority_detected',
        correlationId: ticketId,
        updatesEvent: 'ticket_created',
      });

      void createNotificationsForAgents({
        ticketId,
        type: 'high_priority',
        title: `High priority ticket detected`,
        body: `Priority: ${analysis.result.classification.priority} — Risk: ${analysis.result.riskLevel}. ${analysis.result.summary}`,
      });
    }

    if (analysis.result.nextAction === 'escalate' || analysis.result.nextAction === 'assign') {
      await triggerN8nWorkflow('ai_action_required', {
        ticketId,
        nextAction: analysis.result.nextAction,
        summary: analysis.result.summary,
        riskLevel: analysis.result.riskLevel,
        lifecycleStatus: 'ai_action_required',
        correlationId: ticketId,
        updatesEvent: 'ticket_created',
      });

      void createNotificationsForAgents({
        ticketId,
        type: 'ai_action_pending',
        title: `AI recommends: ${analysis.result.nextAction}`,
        body: analysis.result.summary,
      });
    }

    return analysis.result;
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
          ai_suggested_reply: suggestion.result,
        })
        .eq('id', ticketId);
    }

    await logAiEvent({
      ticketId,
      eventType: 'suggest_reply',
      latencyMs: Date.now() - startedAt,
      success: true,
      promptText: suggestion.promptText,
      modelVersion: suggestion.modelVersion,
      resultJson: {
        suggestion: suggestion.result,
      },
    });

    return suggestion.result;
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
