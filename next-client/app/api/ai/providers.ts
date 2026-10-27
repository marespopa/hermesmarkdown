import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// The model for a request, from the provider, the user's key and the picked
// model. Shared by the one-shot route (app/api/ai/route.ts) and the
// companion's streaming route (app/api/ai/companion/route.ts).
export interface AIModelOptions {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  modelKey: string;
}

export const createAIModel = ({ provider, apiKey, baseUrl, modelKey }: AIModelOptions) => {
  if (provider === 'ollama') {
    // Ollama's OpenAI-compatible endpoint. The key is optional (none locally).
    return createOpenAICompatible({
      name: 'ollama',
      baseURL: `${(baseUrl ?? '').replace(/\/+$/, '')}/v1`,
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    })(modelKey);
  }
  if (provider === 'claude') {
    // Short tier keys (from the static fallback list) map to a known model ID.
    // Anything else is assumed to already be a real Anthropic model ID, as
    // returned by the dynamic /v1/models lookup used to populate the picker.
    const modelId = modelKey === 'opus-4-8' ? 'claude-opus-4-8' :
                    modelKey === 'haiku-4-5' ? 'claude-haiku-4-5-20251001' :
                    modelKey === 'sonnet-5' ? 'claude-sonnet-5' :
                    modelKey && modelKey.startsWith('claude-') ? modelKey :
                    'claude-sonnet-5';

    return createAnthropic({ apiKey, baseURL: 'https://api.anthropic.com/v1' })(modelId);
  } else {
    // Strip models/ prefix if present
    let modelId = (modelKey ?? '').replace('models/', '');

    // Map legacy/shortcut keys to latest versions
    if (modelId === 'gemini-flash' || modelId === 'gemini-1.5-flash' || modelId === 'gemini-2.5-flash') {
      modelId = 'gemini-3.5-flash';
    } else if (modelId === 'gemini-pro' || modelId === 'gemini-1.5-pro' || modelId === 'gemini-2.5-pro') {
      modelId = 'gemini-3.1-pro';
    } else if (modelId === 'gemini-flash-lite') {
      modelId = 'gemini-3.1-flash-lite';
    }

    return createGoogleGenerativeAI({
      apiKey,
    })(modelId);
  }
};
