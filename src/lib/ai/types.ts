import type { TicketPriority } from '@/types/ticket';

export type AiProviderName = 'llama' | 'google';

export interface AnalyzeTicketResult {
  priority: TicketPriority;
  summary: string;
}

export interface SuggestReplyInput {
  title: string;
  description: string;
  comments: string[];
}
