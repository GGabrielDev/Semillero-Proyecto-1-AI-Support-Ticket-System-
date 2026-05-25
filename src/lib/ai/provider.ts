import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { z } from 'zod';

import type { AnalyzeTicketResult, AiProviderName } from '@/lib/ai/types';

const AnalyzeResponseSchema = z.object({
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  summary: z.string().min(10),
});

function stripCodeFences(value: string) {
  return value.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
}

async function runGooglePrompt(system: string, prompt: string) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY.');
  }

  const { text } = await generateText({
    model: google('gemini-1.5-flash'),
    system,
    prompt,
    temperature: 0.2,
  });

  return text;
}

async function runLlamaPrompt(system: string, prompt: string) {
  const baseUrl = (process.env.LLAMA_SERVER_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  const model = process.env.LLAMA_MODEL ?? 'llama3';

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
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

  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

async function complete(system: string, prompt: string) {
  return getAiProviderName() === 'llama'
    ? runLlamaPrompt(system, prompt)
    : runGooglePrompt(system, prompt);
}

export function getAiProviderName(): AiProviderName {
  return process.env.AI_PROVIDER === 'llama' ? 'llama' : 'google';
}

export async function analyzeTicket(title: string, description: string): Promise<AnalyzeTicketResult> {
  const system =
    'You triage support tickets. Respond with valid JSON only: {"priority":"low|medium|high|critical","summary":"..."}.';
  const prompt = `Ticket title: ${title}
Ticket description: ${description}

Return a concise summary and the most appropriate priority.`;
  const raw = await complete(system, prompt);
  const parsed = AnalyzeResponseSchema.safeParse(JSON.parse(stripCodeFences(raw)));

  if (!parsed.success) {
    throw new Error('AI provider returned an invalid analysis payload.');
  }

  return parsed.data;
}

export async function suggestReply(title: string, description: string, comments: string[]) {
  const system =
    'You are a senior support agent. Write a clear, empathetic, professional reply that helps move the ticket toward resolution.';
  const commentsBlock = comments.length ? `- ${comments.join('\n- ')}` : 'No comments yet.';
  const prompt = `Ticket title: ${title}
Ticket description: ${description}

Comments:
${commentsBlock}

Draft a reply the support team can send to the requester.`;
  const raw = await complete(system, prompt);

  return stripCodeFences(raw);
}
