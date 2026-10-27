import { beginAiAction, dismissAiActionStatus, finishAiActionSuccess, finishAiActionError } from "./ai-status";

import type { AIProvider } from "@/app/atoms/ai-atoms";
import { DEFAULT_OLLAMA_BASE_URL } from "@/app/atoms/ai-atoms";

export type { AIProvider };

// The model used before the user picks one. Ollama has none: its models are
// whatever the instance has pulled, listed by /api/tags.
const DEFAULT_MODELS: Record<AIProvider, string> = {
  claude: 'sonnet-5',
  gemini: 'gemini-3.5-flash',
  ollama: '',
};

const getFromStorage = (key: string) => {
  if (typeof window === 'undefined') return null;
  const val = localStorage.getItem(key);
  if (!val) return null;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
};

// The Ollama base URL and whether it is a local instance the server can't (and
// shouldn't) reach: those are called straight from the browser.
export const getOllamaBaseUrl = (): string => getFromStorage("hermes_ollama_base_url") || DEFAULT_OLLAMA_BASE_URL;

export const isLocalBaseUrl = (baseUrl: string): boolean => {
  try {
    const host = new URL(baseUrl).hostname.replace(/^\[|\]$/g, '');
    return host === 'localhost' || host === '::1' || /^127\./.test(host)
      || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)
      || host.endsWith('.local');
  } catch {
    return false;
  }
};

export const getAIConfig = () => {
  const provider = (getFromStorage("hermes_ai_provider") as AIProvider) || 'claude';
  const apiKey = getFromStorage(`hermes_${provider}_key`) || '';
  const modelKey = getFromStorage("selectedAiModel") || DEFAULT_MODELS[provider];

  if (provider === 'ollama') {
    if (!modelKey) throw new Error('No model selected. Pick one in Settings → AI (pull a model in Ollama first).');
    return { provider, apiKey, baseUrl: getOllamaBaseUrl(), modelKey };
  }
  if (!apiKey) {
    throw new Error(`No API key set for ${provider}. Please add it in Settings.`);
  }

  return { provider, apiKey, modelKey };
};

// Whether the AI companion may search the web (Settings → AI Features).
export const isWebSearchEnabled = () => getFromStorage("hermes_ai_web_search") === true;

export const beautifyAIError = (error: string) => {
  const lowerError = error.toLowerCase();
  
  if (lowerError.includes("quota exceeded") || lowerError.includes("exceeded your current quota")) {
    const retryMatch = error.match(/retry in ([\d.]+)s/i);
    const retryText = retryMatch ? ` Please try again in about ${Math.ceil(parseFloat(retryMatch[1]))} seconds.` : "";
    return `AI Quota Exceeded. You've used up your current API allowance.${retryText}`;
  }
  
  if (lowerError.includes("rate limit") || lowerError.includes("429")) {
    return "Rate limit reached. The AI provider is receiving too many requests. Please wait a moment and try again.";
  }

  if (lowerError.includes("high demand") || lowerError.includes("overloaded") || lowerError.includes("529")) {
    return "The AI model is currently overloaded. Please try again in a few seconds.";
  }
  
  if (
    lowerError.includes("unauthorized") ||
    lowerError.includes("authentication") ||
    lowerError.includes("api key not valid") ||
    lowerError.includes("api_key_invalid") ||
    lowerError.includes("permission_denied") ||
    (lowerError.includes("invalid") && (lowerError.includes("api key") || lowerError.includes("api-key")))
  ) {
    return "Invalid API Key. Update your key in Settings → AI and try again.";
  }

  if (lowerError.includes("usage credits") || lowerError.includes("free usage") || lowerError.includes("upgrade for included usage")) {
    // Ollama names a model the plan does include ("Try gemma4:31b-cloud, ..."); keep that hint.
    const suggestion = error.match(/Try ([\w.:-]+)/i)?.[1];
    return `This model isn't included in your Ollama plan.${suggestion ? ` Try ${suggestion} instead,` : " Pick another model,"} or add usage credits at ollama.com/settings.`;
  }

  if (lowerError.includes("base url") && lowerError.includes("not allowed")) {
    return "Base URL restricted for security reasons.";
  }

  if (lowerError.includes("404") || lowerError.includes("not found")) {
    return "Model not found. Verify the model name or pull it first.";
  }

  if (lowerError.includes("cannot connect to api") || lowerError.includes("econnrefused") || lowerError.includes("fetch failed")) {
    return "Unable to reach Ollama endpoint. Check the base URL and CORS configuration.";
  }

  if (lowerError.includes("failed to fetch") || lowerError.includes("network error")) {
    return "Network error. Please check your internet connection and try again.";
  }

  return error;
};

// A request that hasn't answered by then is reported, not left spinning.
const AI_TIMEOUT_MS = 120_000;

// POSTs to the AI proxy and returns its JSON. Times out after AI_TIMEOUT_MS,
// and a reply that isn't JSON (a platform error page, a cut-off response)
// becomes an error naming its status instead of a parse error.
// `signal` lets the caller cancel; a cancelled request throws an AbortError.
async function postAI(body: Record<string, unknown>, fallbackError: string, signal?: AbortSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel);
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      throw new Error(data?.error || `${fallbackError} (Status ${response.status})`);
    }
    return data;
  } catch (error: any) {
    if (signal?.aborted) throw new DOMException('The AI request was cancelled.', 'AbortError');
    if (error?.name === 'AbortError') {
      throw new Error("The AI didn't answer within 2 minutes. Try again or pick a faster model.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

/**
 * Fetches available Claude models via the server proxy (Anthropic's API doesn't
 * allow direct browser calls, unlike Gemini's).
 */
export async function fetchClaudeModels(apiKey: string) {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'models', provider: 'claude', apiKey }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Failed to fetch models (Status ${response.status})`);
    }
    return data.models as { id: string; name: string }[];
  } catch (error: any) {
    throw new Error(beautifyAIError(error.message || "Failed to fetch models."));
  }
}

/**
 * Lists the models an Ollama instance has (its /api/tags). A cloud or hosted
 * instance goes through the server proxy, which guards the URL; a local one is
 * asked directly by the browser (the instance must allow it via OLLAMA_ORIGINS).
 */
export async function fetchOllamaModels(apiKey: string, baseUrl: string = getOllamaBaseUrl()) {
  try {
    if (isLocalBaseUrl(baseUrl)) {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/tags`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      });
      if (!response.ok) throw new Error(`Failed to fetch models (Status ${response.status})`);
      const data = await response.json();
      return (data.models || []).map((m: any) => ({ id: m.name, name: m.name })) as { id: string; name: string }[];
    }
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'models', provider: 'ollama', apiKey, baseUrl }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Failed to fetch models (Status ${response.status})`);
    return data.models as { id: string; name: string }[];
  } catch (error: any) {
    throw new Error(beautifyAIError(error.message || "Failed to fetch models."));
  }
}

export async function fetchGeminiModels(apiKey: string) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1/models`;
    const response = await fetch(url, {
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Failed to fetch models (Status ${response.status})`);
    }

    const data = await response.json();
    const models = data.models || [];
    
    return models.map((m: any) => ({
      id: m.name.replace('models/', ''), // Strip for consistency
      name: m.displayName || m.name
    }));
  } catch (error: any) {
    throw new Error(beautifyAIError(error.message || "Failed to fetch models."));
  }
}

/**
 * Simple text generation for Summarize, Expand, Improve features. Cancelled
 * through `signal`, it clears the AI status quietly and throws an AbortError.
 */
export async function callAI(system: string, prompt: string, signal?: AbortSignal) {
  const seq = beginAiAction("Thinking…");

  try {
    const config = getAIConfig();
    // A local Ollama instance is asked straight from the browser.
    if (config.provider === 'ollama' && isLocalBaseUrl(config.baseUrl)) {
      const { localOllamaText } = await import("./ollama-direct");
      const text = await localOllamaText({ apiKey: config.apiKey, baseUrl: config.baseUrl, modelKey: config.modelKey, system, prompt }, signal);
      finishAiActionSuccess(seq, "Done");
      return text;
    }
    const data = await postAI({ action: 'text', ...config, system, prompt }, "Failed to generate text", signal);

    finishAiActionSuccess(seq, "Done");
    return data.text;
  } catch (error: any) {
    if (signal?.aborted) {
      dismissAiActionStatus(seq);
      throw error;
    }
    console.error("AI Generation Error:", error);
    const message = beautifyAIError(error.message || "An unexpected error occurred during AI generation.");
    finishAiActionError(seq, message);
    throw new Error(message);
  }
}

/**
 * Validates the connection for a given provider and key.
 */
export async function testAIConnection(provider: AIProvider, apiKey: string, baseUrl?: string) {
  const modelKey = getFromStorage("selectedAiModel") || DEFAULT_MODELS[provider];

  try {
    if (provider === 'ollama' && baseUrl && isLocalBaseUrl(baseUrl)) {
      await fetchOllamaModels(apiKey, baseUrl);
      return { success: true };
    }
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test',
        provider,
        apiKey,
        modelKey,
        ...(provider === 'ollama' ? { baseUrl } : {}),
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Connection test failed");

    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: beautifyAIError(error.message || "An unexpected error occurred during the connection test.")
    };
  }
}
