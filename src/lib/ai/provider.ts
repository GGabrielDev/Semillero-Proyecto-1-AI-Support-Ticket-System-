import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { z } from 'zod';

import type {
  AiAnalysisResult,
  AiProviderName,
  AnalyzeTicketResponse,
  SuggestReplyResponse,
} from '@/lib/ai/types';
import { normalizeTicketContext } from '@/lib/ai/normalize';
import { getDbAiConfigs } from '@/lib/ai/config';

const DEFAULT_GOOGLE_MODEL = 'gemini-1.5-flash';

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

async function runGooglePrompt(modelName: string, apiKey: string, system: string, prompt: string) {
  if (!apiKey) {
    throw new Error('Missing Google API key.');
  }

  const googleProvider = createGoogleGenerativeAI({
    apiKey,
  });

  const { text } = await generateText({
    model: googleProvider(modelName || DEFAULT_GOOGLE_MODEL),
    system,
    prompt,
    temperature: 0.2,
  });

  return {
    text,
    modelVersion: modelName || DEFAULT_GOOGLE_MODEL,
  };
}

async function runLlamaPrompt(
  modelName: string,
  baseUrl: string | null,
  apiKey: string | null,
  system: string,
  prompt: string
) {
  const url = (baseUrl ?? 'http://localhost:8080').replace(/\/$/, '');
  const modelVersion = modelName || 'llama3';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${url}/v1/chat/completions`, {
    method: 'POST',
    headers,
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
    throw new Error(`llama-server request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return {
    text: data.choices?.[0]?.message?.content?.trim() ?? '',
    modelVersion,
  };
}

async function runDeepseekPrompt(
  modelName: string,
  apiKey: string,
  baseUrl: string | null,
  system: string,
  prompt: string
) {
  if (!apiKey) {
    throw new Error('Missing DeepSeek API key.');
  }

  const url = (baseUrl ?? 'https://api.deepseek.com/v1').replace(/\/$/, '');
  const modelVersion = modelName || 'deepseek-chat';

  const response = await fetch(`${url}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
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
    throw new Error(`DeepSeek API request failed with status ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return {
    text: data.choices?.[0]?.message?.content?.trim() ?? '',
    modelVersion,
  };
}

interface ExecutableConfig {
  id: string;
  provider: AiProviderName;
  model_name: string;
  api_key: string | null;
  base_url: string | null;
  name: string;
}

async function getExecutableConfigs(): Promise<ExecutableConfig[]> {
  const dbConfigs = await getDbAiConfigs();

  if (dbConfigs.length > 0) {
    const activeAndFallbacks = dbConfigs.filter(
      (c) => c.is_active || c.fallback_order !== null
    );

    if (activeAndFallbacks.length > 0) {
      return activeAndFallbacks.map((c) => ({
        id: c.id,
        provider: c.provider,
        model_name: c.model_name,
        api_key: c.api_key,
        base_url: c.base_url,
        name: `DB ${c.provider} (${c.model_name})${c.is_active ? ' [Active]' : ` [Fallback #${c.fallback_order}]`}`,
      }));
    }
  }

  // Fallback to legacy environment variables
  console.log('[AI Config] No active or fallback configurations found in DB. Falling back to env variables.');
  const configs: ExecutableConfig[] = [];

  const envProvider = getAiProviderName();
  const hasGoogleKey = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

  if (envProvider === 'llama') {
    configs.push({
      id: 'env-llama',
      provider: 'llama',
      model_name: process.env.LLAMA_MODEL ?? 'llama3',
      api_key: null,
      base_url: process.env.LLAMA_SERVER_BASE_URL ?? 'http://localhost:8080',
      name: 'Env Llama',
    });

    if (hasGoogleKey) {
      configs.push({
        id: 'env-google-fallback',
        provider: 'google',
        model_name: DEFAULT_GOOGLE_MODEL,
        api_key: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? null,
        base_url: null,
        name: 'Env Google (Fallback)',
      });
    }
  } else if (envProvider === 'deepseek') {
    // If user configured DEEPSEEK via env (e.g. DEEPSEEK_API_KEY)
    const hasDeepseekKey = Boolean(process.env.DEEPSEEK_API_KEY);
    if (hasDeepseekKey) {
      configs.push({
        id: 'env-deepseek',
        provider: 'deepseek',
        model_name: 'deepseek-chat',
        api_key: process.env.DEEPSEEK_API_KEY ?? null,
        base_url: process.env.DEEPSEEK_BASE_URL ?? null,
        name: 'Env DeepSeek',
      });
    }
    if (hasGoogleKey) {
      configs.push({
        id: 'env-google-fallback',
        provider: 'google',
        model_name: DEFAULT_GOOGLE_MODEL,
        api_key: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? null,
        base_url: null,
        name: 'Env Google (Fallback)',
      });
    }
  } else {
    // Google primary
    if (hasGoogleKey) {
      configs.push({
        id: 'env-google',
        provider: 'google',
        model_name: DEFAULT_GOOGLE_MODEL,
        api_key: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? null,
        base_url: null,
        name: 'Env Google',
      });
    }
  }

  return configs;
}

async function runPromptForConfig(
  provider: AiProviderName,
  modelName: string,
  apiKey: string | null,
  baseUrl: string | null,
  system: string,
  prompt: string
) {
  switch (provider) {
    case 'google':
      return runGooglePrompt(modelName, apiKey ?? '', system, prompt);
    case 'llama':
      return runLlamaPrompt(modelName, baseUrl, apiKey, system, prompt);
    case 'deepseek':
      return runDeepseekPrompt(modelName, apiKey ?? '', baseUrl, system, prompt);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

async function complete(system: string, prompt: string): Promise<{ text: string; modelVersion: string; provider: AiProviderName }> {
  const configs = await getExecutableConfigs();

  if (configs.length === 0) {
    throw new Error(
      'No AI configurations are available. Please configure an AI provider in the Admin panel or set environment variables.'
    );
  }

  let lastError: Error | null = null;

  for (const config of configs) {
    try {
      console.log(`[AI] Running prompt using config: ${config.name}`);
      const result = await runPromptForConfig(
        config.provider,
        config.model_name,
        config.api_key,
        config.base_url,
        system,
        prompt
      );

      return {
        text: result.text,
        modelVersion: result.modelVersion,
        provider: config.provider,
      };
    } catch (err) {
      console.warn(`[AI] Config ${config.name} failed: ${(err as Error).message}`);
      lastError = err as Error;
      // continue to next config in chain
    }
  }

  throw new Error(`All configured AI providers failed. Last error: ${lastError?.message}`);
}

export function getAiProviderName(): AiProviderName {
  const provider = process.env.AI_PROVIDER;
  if (provider === 'llama' || provider === 'deepseek') {
    return provider;
  }
  return 'google';
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
  
  const { text, modelVersion, provider } = await complete(system, promptText);
  const parsed = AiAnalysisSchema.safeParse(parseJsonPayload(text));

  if (!parsed.success) {
    throw new Error('AI provider returned an invalid analysis payload.');
  }

  return {
    result: parsed.data as AiAnalysisResult,
    promptText,
    modelVersion,
    provider,
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
  
  const { text, modelVersion, provider } = await complete(system, promptText);

  return {
    result: stripCodeFences(text),
    promptText,
    modelVersion,
    provider,
  };
}
