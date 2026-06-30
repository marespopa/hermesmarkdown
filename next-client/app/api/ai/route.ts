import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';

const createAIModel = (provider: string, apiKey: string, modelKey: string) => {
  if (provider === 'claude') {
    const modelId = modelKey === 'opus-4-8' ? 'claude-opus-4-8' :
                    modelKey === 'haiku-4-5' ? 'claude-haiku-4-5-20251001' :
                    'claude-sonnet-4-6';
                    
    return createAnthropic({ apiKey, baseURL: 'https://api.anthropic.com/v1' })(modelId);
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

export async function POST(req: Request) {
  try {
    const { action, provider, apiKey, modelKey, system, prompt, noteBody, messages } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    const model = createAIModel(provider, apiKey, modelKey);

    if (action === 'text') {
      // Gemini's content-safety filtering behaves more reliably when the
      // system instructions are folded into the user prompt rather than
      // passed as a separate system message.
      const { text } = provider === 'gemini'
        ? await generateText({ model, prompt: `${system}\n\n--- TASK ---\n\n${prompt}` })
        : await generateText({ model, system, prompt });

      return NextResponse.json({ text });
    }
    
    if (action === 'object') {
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

      return NextResponse.json({ object });
    }

    if (action === 'chat') {
      // messages may have content as a plain string or a content-parts array (for images)
      const msgs = messages as Array<{ role: 'user' | 'assistant'; content: any }>;

      if (provider === 'gemini') {
        // Gemini: fold system into the first user message text part
        const firstContent = msgs[0]?.content;
        const firstText = typeof firstContent === 'string'
          ? firstContent
          : (firstContent as any[]).find((p: any) => p.type === 'text')?.text ?? '';
        const firstParts = typeof firstContent === 'string'
          ? [{ type: 'text' as const, text: `${system}\n\n${firstContent}` }]
          : [{ type: 'text' as const, text: `${system}\n\n${firstText}` }, ...(firstContent as any[]).filter((p: any) => p.type !== 'text')];

        const { text } = await generateText({
          model,
          messages: [
            { role: 'user' as const, content: firstParts },
            ...msgs.slice(1),
          ],
        });
        return NextResponse.json({ text });
      }

      const { text } = await generateText({ model, system, messages: msgs });
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
    const lowerMessage = message.toLowerCase();

    const status =
      lowerMessage.includes("high demand") || lowerMessage.includes("overloaded") || lowerMessage.includes("529")
        ? 503
        : lowerMessage.includes("rate limit") || lowerMessage.includes("429")
        ? 429
        : lowerMessage.includes("unauthorized") || lowerMessage.includes("authentication") || (lowerMessage.includes("invalid") && (lowerMessage.includes("key") || lowerMessage.includes("api")))
        ? 401
        : 500;

    // Strip SDK retry prefix ("Failed after N attempts. Last error: ...") for a cleaner message
    const cleanMessage = message.replace(/^Failed after \d+ attempts?\. Last error:\s*/i, "");

    return NextResponse.json({ error: cleanMessage }, { status });
  }
}
