import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { createAIModel } from './providers';
import { errorStatus, sanitizeMessage } from './errors';
import { BaseUrlError, validateBaseUrl } from './base-url';

// A reply with no text (a thinking model that spent its whole output budget
// before answering, or a filtered response) is an error, not an empty answer:
// the chat would otherwise show nothing and no error.
const emptyReplyError = (finishReason?: string) =>
  NextResponse.json({
    error: finishReason === 'length'
      ? 'The model ran out of output before it answered. Try a shorter request or another model.'
      : finishReason === 'content-filter'
      ? 'The model declined to answer this request.'
      : `The model returned an empty reply${finishReason ? ` (${finishReason})` : ''}. Try again or pick another model.`,
  }, { status: 502 });

export async function POST(req: Request) {
  try {
    const { action, provider, apiKey = '', baseUrl: rawBaseUrl, modelKey, system, prompt } = await req.json();

    // Ollama's key is optional; its base URL is what must be safe to call.
    if (!apiKey && provider !== 'ollama') {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }
    let baseUrl: string | undefined;
    if (provider === 'ollama') {
      try {
        baseUrl = await validateBaseUrl(rawBaseUrl || 'https://ollama.com');
      } catch (error) {
        if (error instanceof BaseUrlError) return NextResponse.json({ error: error.message }, { status: 400 });
        throw error;
      }
    }

    if (action === 'models') {
      if (provider === 'claude') {
        const res = await fetch('https://api.anthropic.com/v1/models?limit=100', {
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          const modelErrorMessage = errorData.error?.message || `Failed to fetch models (Status ${res.status})`;
          return NextResponse.json({ error: sanitizeMessage(modelErrorMessage) }, { status: res.status });
        }
        const data = await res.json();
        const models = (data.data || []).map((m: any) => ({ id: m.id, name: m.display_name || m.id }));
        return NextResponse.json({ models });
      }
      if (provider === 'ollama') {
        const res = await fetch(`${baseUrl}/api/tags`, {
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
          redirect: 'error',
        });
        if (!res.ok) {
          return NextResponse.json({ error: `Failed to fetch models (Status ${res.status})` }, { status: res.status });
        }
        const data = await res.json();
        const models = (data.models || []).map((m: any) => ({ id: m.name, name: m.name }));
        return NextResponse.json({ models });
      }
      return NextResponse.json({ error: "Model listing is not supported for this provider" }, { status: 400 });
    }

    const model = createAIModel({ provider, apiKey, baseUrl, modelKey });

    if (action === 'text') {
      // Gemini's content-safety filtering behaves more reliably when the
      // system instructions are folded into the user prompt rather than
      // passed as a separate system message. Ollama models follow it too.
      const { text, finishReason } = provider === 'gemini' || provider === 'ollama'
        ? await generateText({ model, prompt: `${system}\n\n--- TASK ---\n\n${prompt}` })
        : await generateText({ model, system, prompt });

      if (!text?.trim()) return emptyReplyError(finishReason);
      return NextResponse.json({ text });
    }
    
    if (action === 'test') {
      await generateText({
        model,
        prompt: 'ping',
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error("AI Proxy Error:", error);
    const message: string = error.message || "An unexpected error occurred during AI processing.";
    const status = errorStatus(message);

    const cleanMessage = sanitizeMessage(message);

    return NextResponse.json({ error: cleanMessage }, { status });
  }
}
