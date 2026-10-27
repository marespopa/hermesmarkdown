// Local Ollama, called from the browser. The server refuses loopback and
// private hosts (app/api/ai/base-url.ts), so a local instance is reached
// straight from here instead (it must allow this origin via OLLAMA_ORIGINS).
// The libraries load on first use so they stay out of the main bundle.

interface LocalOllamaConfig {
  apiKey?: string;
  baseUrl: string;
  modelKey: string;
}

async function localModel({ apiKey, baseUrl, modelKey }: LocalOllamaConfig) {
  const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
  return createOpenAICompatible({
    name: "ollama",
    baseURL: `${baseUrl.replace(/\/+$/, "")}/v1`,
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  })(modelKey);
}

// A one-shot text request (the same shape as the server's `text` action).
export async function localOllamaText(
  config: LocalOllamaConfig & { system: string; prompt: string },
  signal?: AbortSignal,
): Promise<string> {
  const { generateText } = await import("ai");
  const { text } = await generateText({
    model: await localModel(config),
    prompt: `${config.system}\n\n--- TASK ---\n\n${config.prompt}`,
    abortSignal: signal,
  });
  if (!text?.trim()) throw new Error("The model returned an empty reply. Try again or pick another model.");
  return text;
}

// The companion's request, answered here instead of by /api/ai/companion: the
// same tools and folded system prompt, streamed back as a UI message stream.
export async function localOllamaCompanion(request: Record<string, any>, signal?: AbortSignal): Promise<Response> {
  const [{ convertToModelMessages, streamText }, { COMPANION_TOOLS, foldSystem }] = await Promise.all([
    import("ai"),
    import("@/app/api/ai/companion/companion-tools"),
  ]);
  const model = await localModel({ apiKey: request.apiKey, baseUrl: request.baseUrl, modelKey: request.modelKey });
  const modelMessages = await convertToModelMessages(request.messages, { tools: COMPANION_TOOLS, ignoreIncompleteToolCalls: true });
  const result = streamText({
    model,
    tools: COMPANION_TOOLS,
    messages: foldSystem(request.system ?? "", modelMessages),
    abortSignal: signal ?? undefined,
  });
  return result.toUIMessageStreamResponse({
    onError: (error) => (error instanceof Error && error.message) || "The AI request failed.",
  });
}

// Wraps the companion's fetch: a request for a local Ollama instance is
// answered in the browser, anything else goes on to the server.
export function withLocalOllama(
  next: typeof globalThis.fetch,
  isLocal: (baseUrl: string) => boolean,
): typeof globalThis.fetch {
  return async (input, init) => {
    if (typeof init?.body === "string") {
      try {
        const request = JSON.parse(init.body);
        if (request.provider === "ollama" && typeof request.baseUrl === "string" && isLocal(request.baseUrl)) {
          return await localOllamaCompanion(request, init.signal ?? undefined);
        }
      } catch (error) {
        // A body that isn't JSON is the server's to reject; a local failure is shown as text.
        if (error instanceof SyntaxError) return next(input, init);
        return new Response((error instanceof Error && error.message) || "The AI request failed.", { status: 500 });
      }
    }
    return next(input, init);
  };
}
