import type { TicketPriority } from '@/types/ticket';

export type AiProviderName = 'llama' | 'google';

export interface AiAnalysisResult {
  summary: string;
  classification: {
    priority: TicketPriority;
    sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
    category: string;
  };
  suggestions: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  nextAction: 'assign' | 'escalate' | 'close' | 'request_info' | 'monitor';
}

export type AnalyzeTicketResult = AiAnalysisResult;

export interface SuggestReplyInput {
  title: string;
  description: string;
  comments: string[];
}

export interface AiInvocationMetadata {
  promptText: string;
  modelVersion: string;
  provider: AiProviderName;
}

export interface AnalyzeTicketResponse extends AiInvocationMetadata {
  result: AiAnalysisResult;
}

export interface SuggestReplyResponse extends AiInvocationMetadata {
  result: string;
}
