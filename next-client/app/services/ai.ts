import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';

export type AIProvider = 'claude' | 'gemini';

const getFromStorage = (key: string) => {
  if (typeof window === 'undefined') return null;
  const val = localStorage.getItem(key);
  if (!val) return null;
  try {
    // Jotai's atomWithStorage stringifies values, so we need to parse them.
    return JSON.parse(val);
  } catch {
    return val;
  }
};

const createAIModel = (provider: AIProvider, apiKey: string, modelKey: string) => {
  if (provider === 'claude') {
    const modelId = modelKey === 'opus-4-8' ? 'claude-opus-4-8' : 
                    modelKey === 'haiku-4-5' ? 'claude-haiku-4-5' : 
                    'claude-sonnet-4-6';
                    
    return createAnthropic({
      apiKey,
      headers: { "anthropic-dangerous-direct-browser-access": "true" }
    })(modelId);
  } else {
    // Strip models/ prefix if present
    let modelId = modelKey.replace('models/', '');
    
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

const getProvider = () => {
  const provider = (getFromStorage("hermes_ai_provider") as AIProvider) || 'claude';
  const apiKey = getFromStorage(`hermes_${provider}_key`);
  const modelKey = getFromStorage("selectedAiModel") || (provider === 'claude' ? 'sonnet-4-6' : 'gemini-3.5-flash');
  
  if (!apiKey) {
    throw new Error(`No API key set for ${provider}. Please add it in Settings.`);
  }

  return createAIModel(provider, apiKey, modelKey);
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
    throw error;
  }
}

/**
 * Simple text generation for Summarize, Expand, Improve features.
 */
export async function callAI(system: string, prompt: string) {
  const model = getProvider();
  if (!model) throw new Error("AI provider not available in this environment.");

  const provider = (getFromStorage("hermes_ai_provider") as AIProvider) || 'claude';

  try {
    const { text } = await generateText({
      model,
      // For Gemini on production v1, we fold system instructions into the user message
      // to avoid 'Unknown name "systemInstruction"' payload errors.
      messages: provider === 'gemini' 
        ? [{ role: 'user', content: `${system}\n\n--- TASK ---\n\n${prompt}` }]
        : [
            { role: 'system', content: system },
            { role: 'user', content: prompt }
          ],
    });
    return text;
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    throw new Error(error.message || "An unexpected error occurred during AI generation.");
  }
}

/**
 * Structured object generation for Frontmatter feature.
 */
export async function generateFrontmatterData(noteBody: string) {
  const model = getProvider();
  if (!model) throw new Error("AI provider not available in this environment.");

  try {
    const { object } = await generateObject({
      model,
      schema: z.object({
        title: z.string().describe("a concise, descriptive title for the note"),
        scope: z.string().describe("one sentence summary, max 20 words"),
        tags: z.array(z.string()).describe("3-5 lowercase kebab-case tags"),
        read_when: z.array(z.string()).describe("2-3 phrases starting with 'when you need to...'"),
      }),
      messages: [
        { role: 'user', content: `Generate metadata for this note body:\n\n${noteBody}` }
      ],
    });
    return object;
  } catch (error: any) {
    console.error("AI Structured Data Error:", error);
    throw new Error(error.message || "Failed to generate structured frontmatter.");
  }
}

/**
 * Validates the connection for a given provider and key.
 */
export async function testAIConnection(provider: AIProvider, apiKey: string) {
  const modelKey = getFromStorage("selectedAiModel") || (provider === 'claude' ? 'sonnet-4-6' : 'gemini-3.5-flash');
  
  const model = createAIModel(provider, apiKey, modelKey);

  try {
    await generateText({
      model,
      prompt: 'ping',
    });
    return { success: true };
  } catch (error: any) {
    console.error(`AI connection test failed for ${provider}:`, error);
    return { 
      success: false, 
      error: error.message || "An unexpected error occurred during the connection test."
    };
  }
}
