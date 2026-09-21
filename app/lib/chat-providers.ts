import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };
export type Provider = { name: 'gemini' | 'groq'; generate: (system: string, messages: ChatTurn[]) => Promise<string> };

export function configuredProviders(): Provider[] {
  const providers: Provider[] = [];
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (geminiKey) providers.push({
    name: 'gemini',
    async generate(system, messages) {
      const result = await generateText({
        model: createGoogleGenerativeAI({ apiKey: geminiKey })(process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash'),
        system, messages, temperature: 0.3, maxOutputTokens: 700,
        maxRetries: 0, abortSignal: AbortSignal.timeout(10000),
      });
      if (result.finishReason === 'length') throw new Error('Truncated response');
      return result.text;
    },
  });
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) providers.push({
    name: 'groq',
    async generate(system, messages) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-20b',
          messages: [{ role: 'system', content: system }, ...messages],
          temperature: 0.3, max_completion_tokens: 1200,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.choices?.[0]?.finish_reason === 'length') throw new Error('Truncated response');
      return typeof data.choices?.[0]?.message?.content === 'string' ? data.choices[0].message.content : '';
    },
  });
  return providers;
}

export async function generateWithFallback(system: string, messages: ChatTurn[], providers = configuredProviders()) {
  for (const provider of providers) {
    try {
      const message = (await provider.generate(system, messages)).trim();
      if (message) return { message, provider: provider.name };
      console.warn(`Chat ${provider.name}: empty response; trying fallback.`);
    } catch {
      // Never log provider payloads: they can contain credentials or user data.
      console.warn(`Chat ${provider.name}: request failed; trying fallback.`);
    }
  }
  return null;
}
