import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { createAIModel } from '../providers';
import { BaseUrlError, validateBaseUrl } from '../base-url';
import { errorMessage, errorStatus, sanitizeMessage } from '../errors';
import { COMPANION_TOOLS, foldSystem, webSearchTool, withPromptCache } from './companion-tools';
import { withKeepAlive } from './keep-alive';
import { COMPANION_EXECUTION_TOOL_NAMES, COMPANION_MUTATING_TOOL_NAMES } from '@/app/services/companion-tool-defs';

// The AI companion's streaming route. The client (useChat in
// app/editor/components/companion/use-companion-chat.ts) sends the thread as
// UI messages with the user's provider, key and model, and whether Claude
// may search the web; the reply streams back
// as a UI message stream. Tool calls end the step and run in the browser,
// which sends their results with the next request. Errors before the stream
// starts are plain text (useChat shows a failed response's text); errors
// during it are sanitized into the stream. While the model thinks, keep-alive
// pings hold the connection open (keep-alive.ts). Claude's requests mark the
// prompt and thread for its prompt cache (withPromptCache).
// Long replies (thinking, web search) outlast a host's default function limit.
export const maxDuration = 300;
const MUTATING_TOOL_NAMES = new Set<string>([...COMPANION_MUTATING_TOOL_NAMES, ...COMPANION_EXECUTION_TOOL_NAMES]);

export async function POST(req: Request) {
  try {
    const { provider, apiKey = '', baseUrl: rawBaseUrl, modelKey, system = '', messages, webSearch = false, planning = false } = await req.json() as {
      provider?: string;
      apiKey?: string;
      baseUrl?: string;
      modelKey?: string;
      system?: string;
      messages?: UIMessage[];
      webSearch?: boolean;
      planning?: boolean;
    };
    if (!apiKey && provider !== 'ollama') return new Response('API key is required', { status: 400 });
    if (!Array.isArray(messages) || !messages.length) return new Response('No messages to answer', { status: 400 });

    let baseUrl: string | undefined;
    if (provider === 'ollama') {
      try {
        baseUrl = await validateBaseUrl(rawBaseUrl || 'https://ollama.com');
      } catch (error) {
        if (error instanceof BaseUrlError) return new Response(error.message, { status: 400 });
        throw error;
      }
    }
    const model = createAIModel({ provider: provider ?? 'claude', apiKey, baseUrl, modelKey: modelKey ?? '' });
    // Web search is Claude's own tool; Gemini's Google Search isn't offered
    // (whether it can run beside the browser-run tools isn't settled), and
    // Ollama has none.
    const modelId = typeof model === 'string' ? model : model.modelId;
    const planningTools = planning
      ? Object.fromEntries(Object.entries(COMPANION_TOOLS).filter(([name]) => !MUTATING_TOOL_NAMES.has(name)))
      : COMPANION_TOOLS;
    const tools = (provider ?? 'claude') === 'claude' && webSearch
      ? { ...planningTools, web_search: webSearchTool(modelId) }
      : planningTools;
    // A turn stopped mid tool call leaves a call with no result; it is dropped.
    const modelMessages = await convertToModelMessages(messages, { tools, ignoreIncompleteToolCalls: true });
    const result = provider === 'gemini' || provider === 'ollama'
      ? streamText({ model, tools, messages: foldSystem(system, modelMessages) })
      : streamText({ model, tools, messages: withPromptCache(system, modelMessages) });

    return withKeepAlive(result.toUIMessageStreamResponse({
      // Web search results' pages, shown as links under the reply.
      sendSources: true,
      // Reasoning is never shown, so it isn't streamed.
      sendReasoning: false,
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
