import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { z } from 'zod';

import type {
  AiAnalysisResult,
  AiProviderName,
  AnalyzeTicketResponse,
  SuggestReplyResponse,
} from '@/lib/ai/types';
import { normalizeTicketContext } from '@/lib/ai/normalize';

const GOOGLE_MODEL = 'gemini-1.5-flash';

const AiAnalysisSchema = z.object({
  summary: z.string().min(10),
  classification: z.object({
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    sentiment: z.enum(['positive', 'neutral', 'negative', 'frustrated']),
    category: z.string().min(2),
  }),
  suggestions: z.array(z.string().min(3)).length(3),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  nextAction: z.enum(['assign', 'escalate', 'close', 'request_info', 'monitor']),
});

function stripCodeFences(value: string) {
  return value.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
}

function parseJsonPayload(raw: string): unknown {
  try {
    return JSON.parse(stripCodeFences(raw));
  } catch {
    throw new Error('AI provider returned malformed JSON.');
  }
}

async function runGooglePrompt(system: string, prompt: string) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY.');
  }

  const { text } = await generateText({
    model: google(GOOGLE_MODEL),
    system,
    prompt,
    temperature: 0.2,
  });

  return {
    text,
    modelVersion: GOOGLE_MODEL,
  };
}

async function runLlamaPrompt(system: string, prompt: string) {
  const baseUrl = (process.env.LLAMA_SERVER_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  const modelVersion = process.env.LLAMA_MODEL ?? 'llama3';

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelVersion,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`llama-server request failed with ${response.status}.`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return {
    text: data.choices?.[0]?.message?.content?.trim() ?? '',
    modelVersion,
  };
}

async function complete(system: string, prompt: string) {
  if (getAiProviderName() === 'llama') {
    try {
      return await runLlamaPrompt(system, prompt);
    } catch (err) {
      const hasGoogleKey = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
      const llamaUrl = process.env.LLAMA_SERVER_BASE_URL ?? 'http://localhost:8080';

      if (hasGoogleKey) {
        console.warn(
          `[AI] llama-server at ${llamaUrl} failed (${(err as Error).message}). ` +
            `Falling back to Google Generative AI (${GOOGLE_MODEL}).`,
        );
        return runGooglePrompt(system, prompt);
      }

      console.error(
        `[AI] llama-server at ${llamaUrl} failed and GOOGLE_GENERATIVE_AI_API_KEY is not set. ` +
          `Set GOOGLE_GENERATIVE_AI_API_KEY (https://aistudio.google.com/app/apikey) ` +
          `to enable the fallback provider.`,
      );
      throw new Error(
        'AI provider unavailable: llama-server is unreachable and no Google API key is configured. ' +
          'Set GOOGLE_GENERATIVE_AI_API_KEY to enable the fallback provider.',
      );
    }
  }

  return runGooglePrompt(system, prompt);
}

export function getAiProviderName(): AiProviderName {
  return process.env.AI_PROVIDER === 'llama' ? 'llama' : 'google';
}

export async function analyzeTicket(title: string, description: string): Promise<AnalyzeTicketResponse> {
  const ctx = normalizeTicketContext(title, description);
  const system = `You triage support tickets. Respond with valid JSON only and no markdown.
JSON schema:
{
  "summary": "short summary",
  "classification": {
    "priority": "low|medium|high|critical",
    "sentiment": "positive|neutral|negative|frustrated",
    "category": "category name"
  },
  "suggestions": ["action 1", "action 2", "action 3"],
  "riskLevel": "low|medium|high|critical",
  "nextAction": "assign|escalate|close|request_info|monitor"
}`;
  const promptText = `Ticket title: ${ctx.title}
Ticket description: ${ctx.description}

Return a concise summary, classification, exactly 3 actionable suggestions, a risk level, and the best next action.`;
  const { text, modelVersion } = await complete(system, promptText);
  const parsed = AiAnalysisSchema.safeParse(parseJsonPayload(text));

  if (!parsed.success) {
    throw new Error('AI provider returned an invalid analysis payload.');
  }

  return {
    result: parsed.data as AiAnalysisResult,
    promptText,
    modelVersion,
    provider: getAiProviderName(),
  };
}

export async function suggestReply(
  title: string,
  description: string,
  comments: string[],
): Promise<SuggestReplyResponse> {
  const ctx = normalizeTicketContext(title, description, comments);
  const system =
    'You are a senior support agent. Write a clear, empathetic, professional reply that helps move the ticket toward resolution.';
  const commentsBlock = ctx.comments.length ? `- ${ctx.comments.join('\n- ')}` : 'No comments yet.';
  const promptText = `Ticket title: ${ctx.title}
Ticket description: ${ctx.description}

Comments:
${commentsBlock}

Draft a reply the support team can send to the requester.`;
  const { text, modelVersion } = await complete(system, promptText);

  return {
    result: stripCodeFences(text),
    promptText,
    modelVersion,
    provider: getAiProviderName(),
  };
}
