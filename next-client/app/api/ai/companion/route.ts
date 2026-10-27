import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { createAIModel } from '../providers';
import { errorMessage, errorStatus, sanitizeMessage } from '../errors';
import { COMPANION_TOOLS, foldSystem, webSearchTool } from './companion-tools';
import { withKeepAlive } from './keep-alive';

// The AI companion's streaming route. The client (useChat in
// app/editor/components/companion/use-companion-chat.ts) sends the thread as
// UI messages with the user's provider, key and model, and whether Claude
// may search the web; the reply streams back
// as a UI message stream. Tool calls end the step and run in the browser,
// which sends their results with the next request. Errors before the stream
// starts are plain text (useChat shows a failed response's text); errors
// during it are sanitized into the stream. While the model thinks, keep-alive
// pings hold the connection open (keep-alive.ts).
export async function POST(req: Request) {
  try {
    const { provider, apiKey, modelKey, system = '', messages, webSearch = false } = await req.json() as {
      provider?: string;
      apiKey?: string;
      modelKey?: string;
      system?: string;
      messages?: UIMessage[];
      webSearch?: boolean;
    };
    if (!apiKey) return new Response('API key is required', { status: 400 });
    if (!Array.isArray(messages) || !messages.length) return new Response('No messages to answer', { status: 400 });

    const model = createAIModel(provider ?? 'claude', apiKey, modelKey ?? '');
    // Web search is Claude's own tool; Gemini's Google Search isn't offered
    // (whether it can run beside the browser-run tools isn't settled).
    const modelId = typeof model === 'string' ? model : model.modelId;
    const tools = provider !== 'gemini' && webSearch
      ? { ...COMPANION_TOOLS, web_search: webSearchTool(modelId) }
      : COMPANION_TOOLS;
    // A turn stopped mid tool call leaves a call with no result; it is dropped.
    const modelMessages = await convertToModelMessages(messages, { tools, ignoreIncompleteToolCalls: true });
    const result = provider === 'gemini'
      ? streamText({ model, tools, messages: foldSystem(system, modelMessages) })
      : streamText({ model, system, tools, messages: modelMessages });

    return withKeepAlive(result.toUIMessageStreamResponse({
      // Web search results' pages, shown as links under the reply.
      sendSources: true,
      onError: (error) => {
        console.error('AI companion stream error:', error);
        return sanitizeMessage(errorMessage(error, 'The AI request failed.'));
      },
    }));
  } catch (error) {
    console.error('AI companion error:', error);
    const message = errorMessage(error, 'An unexpected error occurred during AI processing.');
    return new Response(sanitizeMessage(message), { status: errorStatus(message) });
  }
}
