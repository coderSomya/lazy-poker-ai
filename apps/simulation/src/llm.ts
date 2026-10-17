import OpenAI from 'openai';
import { PlayerConfig } from '@lazy-poker/config';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type OpenAICompatibleProvider = Exclude<PlayerConfig['provider'], 'anthropic'>;

const PROVIDER_CONFIG: Record<OpenAICompatibleProvider, { apiKeyEnv: string; baseURL?: string }> = {
  openai: { apiKeyEnv: 'OPENAI_API_KEY' },
  mistral: { apiKeyEnv: 'MISTRAL_API_KEY', baseURL: 'https://api.mistral.ai/v1' },
  qwen: { apiKeyEnv: 'QWEN_API_KEY', baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1' },
  glm: { apiKeyEnv: 'GLM_API_KEY', baseURL: 'https://open.bigmodel.cn/api/paas/v4' },
  kimi: { apiKeyEnv: 'KIMI_K3_API_KEY', baseURL: 'https://api.moonshot.ai/v1' },
};

const openAIClients = new Map<OpenAICompatibleProvider, OpenAI>();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function getOpenAIClient(provider: OpenAICompatibleProvider): OpenAI {
  const existing = openAIClients.get(provider);
  if (existing) return existing;

  const providerConfig = PROVIDER_CONFIG[provider];
  const client = new OpenAI({
    apiKey: requireEnv(providerConfig.apiKeyEnv),
    baseURL: providerConfig.baseURL,
  });
  openAIClients.set(provider, client);
  return client;
}

async function callOpenAICompatible(player: PlayerConfig, messages: LLMMessage[]): Promise<string> {
  const client = getOpenAIClient(player.provider as OpenAICompatibleProvider);
  const response = await client.chat.completions.create({
    model: player.model,
    messages,
    temperature: 0.7,
    max_tokens: 256,
    response_format: { type: 'json_object' },
  });
  return response.choices[0]?.message?.content ?? '{}';
}

async function callAnthropic(player: PlayerConfig, messages: LLMMessage[]): Promise<string> {
  const system = messages.find((m) => m.role === 'system')?.content;
  const userMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': requireEnv('ANTHROPIC_API_KEY'),
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: player.model,
      system,
      messages: userMessages,
      temperature: 0.7,
      max_tokens: 256,
    }),
  });

  const body = await response.json() as {
    content?: Array<{ type: string; text?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(`Anthropic ${response.status}: ${body.error?.message ?? response.statusText}`);
  }

  return body.content?.find((part) => part.type === 'text')?.text ?? '{}';
}

export async function callLLM(player: PlayerConfig, messages: LLMMessage[]): Promise<string> {
  if (player.provider === 'anthropic') return callAnthropic(player, messages);
  return callOpenAICompatible(player, messages);
}
