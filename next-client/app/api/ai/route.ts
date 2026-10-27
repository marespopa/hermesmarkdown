import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { createAIModel } from './providers';
import { errorStatus, sanitizeMessage } from './errors';

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
    const { action, provider, apiKey, modelKey, system, prompt } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
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
      return NextResponse.json({ error: "Model listing is not supported for this provider" }, { status: 400 });
    }

    const model = createAIModel(provider, apiKey, modelKey);

    if (action === 'text') {
      // Gemini's content-safety filtering behaves more reliably when the
      // system instructions are folded into the user prompt rather than
      // passed as a separate system message.
      const { text, finishReason } = provider === 'gemini'
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
