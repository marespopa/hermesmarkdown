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

const getAIConfig = () => {
  const provider = (getFromStorage("hermes_ai_provider") as AIProvider) || 'claude';
  const apiKey = getFromStorage(`hermes_${provider}_key`);
  const modelKey = getFromStorage("selectedAiModel") || (provider === 'claude' ? 'sonnet-4-6' : 'gemini-3.5-flash');
  
  if (!apiKey) {
    throw new Error(`No API key set for ${provider}. Please add it in Settings.`);
  }

  return { provider, apiKey, modelKey };
};

const beautifyAIError = (error: string) => {
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
    (lowerError.includes("invalid") && (lowerError.includes("api key") || lowerError.includes("api-key")))
  ) {
    return "Invalid API Key. Please check your settings and ensure your key is correct.";
  }

  if (lowerError.includes("failed to fetch") || lowerError.includes("network error")) {
    return "Network error. Please check your internet connection and try again.";
  }

  return error;
};

/**
 * Fetches available Gemini models using a direct REST call for maximum compatibility.
 */
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
    console.error("Error fetching Gemini models:", error);
    throw new Error(beautifyAIError(error.message || "Failed to fetch models."));
  }
}

/**
 * Multi-turn chat generation for the AI Chat dialog.
 */
export type ApiPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string; mimeType: string };

export type ApiMessage = {
  role: 'user' | 'assistant';
  content: string | ApiPart[];
};

export async function callAIChat(system: string, messages: ApiMessage[]) {
  const seq = beginAiAction("Thinking…");

  try {
    const config = getAIConfig();
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'chat', ...config, system, messages }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to generate response");

    finishAiActionSuccess(seq, "Done");
    return data.text as string;
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    const message = beautifyAIError(error.message || "An unexpected error occurred.");
    finishAiActionError(seq, message);
    throw new Error(message);
  }
}

/**
 * Simple text generation for Summarize, Expand, Improve features.
 */
export async function callAI(system: string, prompt: string) {
  const seq = beginAiAction("Thinking…");

  try {
    const config = getAIConfig();
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'text',
        ...config,
        system,
        prompt
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to generate text");

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
 * Structured object generation for Frontmatter feature.
 */
export async function generateFrontmatterData(noteBody: string) {
  const seq = beginAiAction("Generating frontmatter…");

  try {
    const config = getAIConfig();
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'object',
        ...config,
        noteBody
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to generate structured frontmatter");

    finishAiActionSuccess(seq, "Frontmatter generated");
    return data.object;
  } catch (error: any) {
    console.error("AI Structured Data Error:", error);
    const message = beautifyAIError(error.message || "Failed to generate structured frontmatter.");
    finishAiActionError(seq, message);
    throw new Error(message);
  }
}

/**
 * Fixes structural/formatting issues across the whole document (frontmatter,
 * headings, syntax) in a single pass, returning the corrected markdown.
 */
export async function generateContentFix(content: string, issues: string[]) {
  const system = `You are an expert markdown editor. Fix the structural and formatting issues listed below in the given document, while preserving its meaning and existing information.
Rules:
- Preserve existing frontmatter values that are already correct; only fill in or fix what's missing or wrong.
- Keep the body content's meaning intact — only restructure headings, fences, bullets, tables, bold, etc. as needed to resolve the listed issues.
- Return ONLY the complete corrected markdown document (including frontmatter) — no commentary, no explanation, no wrapping code fences.`;

  const prompt = `Issues to fix:\n${issues.map((i) => `- ${i}`).join("\n")}\n\n--- DOCUMENT ---\n${content}`;

  const text = await callAI(system, prompt);
  const fenceMatch = text.trim().match(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/);
  return fenceMatch ? fenceMatch[1] : text.trim();
}

/**
 * Generates a complete markdown note (body + frontmatter metadata) from a user prompt.
 */
export async function generateFileFromPrompt(userPrompt: string) {
  const body = await callAI(
    "You are a markdown note writer. Write a well-structured, informative markdown note based on the user's prompt. Use headers, lists, and code blocks where appropriate. Do not include YAML frontmatter. Return only the markdown content.",
    userPrompt
  );
  const meta = await generateFrontmatterData(body);
  return { body, ...meta };
}

/**
 * Validates the connection for a given provider and key.
 */
export async function testAIConnection(provider: AIProvider, apiKey: string) {
  const modelKey = getFromStorage("selectedAiModel") || (provider === 'claude' ? 'sonnet-4-6' : 'gemini-3.5-flash');

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
