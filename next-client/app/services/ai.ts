import { beginAiAction, finishAiActionSuccess, finishAiActionError } from "./ai-status";

export type AIProvider = 'claude' | 'gemini';

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

export const getAIConfig = () => {
  const provider = (getFromStorage("hermes_ai_provider") as AIProvider) || 'claude';
  const apiKey = getFromStorage(`hermes_${provider}_key`);
  const modelKey = getFromStorage("selectedAiModel") || (provider === 'claude' ? 'sonnet-5' : 'gemini-3.5-flash');
  
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
async function postAI(body: Record<string, unknown>, fallbackError: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
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
    if (error?.name === 'AbortError') {
      throw new Error("The AI didn't answer within 2 minutes. Try again or pick a faster model.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
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
 * Simple text generation for Summarize, Expand, Improve features.
 */
export async function callAI(system: string, prompt: string) {
  const seq = beginAiAction("Thinking…");

  try {
    const config = getAIConfig();
    const data = await postAI({ action: 'text', ...config, system, prompt }, "Failed to generate text");

    finishAiActionSuccess(seq, "Done");
    return data.text;
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    const message = beautifyAIError(error.message || "An unexpected error occurred during AI generation.");
    finishAiActionError(seq, message);
    throw new Error(message);
  }
}

/**
 * Validates the connection for a given provider and key.
 */
export async function testAIConnection(provider: AIProvider, apiKey: string) {
  const modelKey = getFromStorage("selectedAiModel") || (provider === 'claude' ? 'sonnet-5' : 'gemini-3.5-flash');

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test',
        provider,
        apiKey,
        modelKey
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Connection test failed");

    return { success: true };
  } catch (error: any) {
    console.error(`AI connection test failed for ${provider}:`, error);
    return { 
      success: false, 
      error: beautifyAIError(error.message || "An unexpected error occurred during the connection test.")
    };
  }
}
