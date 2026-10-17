import OpenAI from 'openai';
import { config } from '@lazy-poker/config';

const client = new OpenAI({
  baseURL: config.openRouter.baseUrl,
  apiKey: config.openRouter.apiKey,
  defaultHeaders: {
    'HTTP-Referer': 'https://lazy-poker-ai.local',
    'X-Title': 'Lazy Poker AI',
  },
});

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callLLM(model: string, messages: LLMMessage[]): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    max_tokens: 256,
    response_format: { type: 'json_object' },
  });
  return response.choices[0]?.message?.content ?? '{}';
}
