// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const streamTextMock = vi.fn();
const convertMock = vi.fn();
const toResponseMock = vi.fn();

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => (modelId: string) => ({ modelId, provider: 'google' })),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => (modelId: string) => ({ modelId, provider: 'anthropic' })),
  anthropic: {
    tools: {
      webSearch_20260209: vi.fn((args: unknown) => ({ type: 'provider', id: 'anthropic.web_search_20260209', args })),
      webSearch_20250305: vi.fn((args: unknown) => ({ type: 'provider', id: 'anthropic.web_search_20250305', args })),
    },
  },
}));

vi.mock('ai', () => ({
  streamText: (...args: unknown[]) => streamTextMock(...args),
  convertToModelMessages: (...args: unknown[]) => convertMock(...args),
}));

const uiMessages = [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Rename the roadmap note' }] }];
const modelMessages = [{ role: 'user', content: [{ type: 'text', text: 'Rename the roadmap note' }] }];

const post = async (body: Record<string, unknown>) => {
  const { POST } = await import('./route');
  return POST(new Request('http://localhost/api/ai/companion', { method: 'POST', body: JSON.stringify(body) }));
};

describe('AI companion route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    convertMock.mockResolvedValue(modelMessages);
    toResponseMock.mockReturnValue(new Response('stream'));
    streamTextMock.mockReturnValue({ toUIMessageStreamResponse: toResponseMock });
  });

  it('requires an API key', async () => {
    const response = await post({ provider: 'claude', messages: uiMessages });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('API key is required');
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it('streams Claude with the system prompt and the browser-run tools', async () => {
    const response = await post({ provider: 'claude', apiKey: 'claude-key', modelKey: 'sonnet-5', system: 'Be brief', messages: uiMessages });

    expect(await response.text()).toBe(': keep-alive\n\nstream');
    const options = streamTextMock.mock.calls[0][0];
    expect(options.model).toEqual({ modelId: 'claude-sonnet-5', provider: 'anthropic' });
    expect(options.system).toBe('Be brief');
    expect(options.messages).toBe(modelMessages);
    expect(Object.keys(options.tools)).toEqual(expect.arrayContaining(['search_notes', 'read_file', 'list_folder', 'get_active_note']));
    expect(Object.values(options.tools).every((tool) => !(tool as { execute?: unknown }).execute)).toBe(true);
  });

  it('offers Claude web search only when asked, by the model\'s version, and streams its sources', async () => {
    await post({ provider: 'claude', apiKey: 'claude-key', modelKey: 'sonnet-5', messages: uiMessages });
    expect(streamTextMock.mock.calls[0][0].tools).not.toHaveProperty('web_search');

    await post({ provider: 'claude', apiKey: 'claude-key', modelKey: 'sonnet-5', messages: uiMessages, webSearch: true });
    expect(streamTextMock.mock.calls[1][0].tools.web_search).toEqual({ type: 'provider', id: 'anthropic.web_search_20260209', args: { maxUses: 5 } });
    expect(toResponseMock.mock.calls[1][0].sendSources).toBe(true);

    await post({ provider: 'claude', apiKey: 'claude-key', modelKey: 'haiku-4-5', messages: uiMessages, webSearch: true });
    expect(streamTextMock.mock.calls[2][0].tools.web_search.id).toBe('anthropic.web_search_20250305');
  });

  it('never offers web search to Gemini', async () => {
    await post({ provider: 'gemini', apiKey: 'google-key', modelKey: 'gemini-flash', messages: uiMessages, webSearch: true });
    expect(streamTextMock.mock.calls[0][0].tools).not.toHaveProperty('web_search');
  });

  it('folds the system prompt into the first user message for Gemini', async () => {
    await post({ provider: 'gemini', apiKey: 'google-key', modelKey: 'gemini-flash', system: 'Be brief', messages: uiMessages });

    const options = streamTextMock.mock.calls[0][0];
    expect(options.model).toEqual({ modelId: 'gemini-3.5-flash', provider: 'google' });
    expect(options.system).toBeUndefined();
    expect(options.messages[0].content[0]).toEqual({ type: 'text', text: 'Be brief' });
    expect(options.messages[0].content[1]).toEqual({ type: 'text', text: 'Rename the roadmap note' });
  });

  it('sanitizes errors raised during the stream', async () => {
    await post({ provider: 'claude', apiKey: 'claude-key', messages: uiMessages });

    const { onError } = toResponseMock.mock.calls[0][0];
    expect(onError(new Error('Bad key sk-ant-abcdefghijklmnop'))).toBe('Bad key [REDACTED]');
  });

  it('answers a failure before streaming as plain text with its status', async () => {
    streamTextMock.mockImplementation(() => { throw new Error('rate limit reached'); });

    const response = await post({ provider: 'claude', apiKey: 'claude-key', messages: uiMessages });

    expect(response.status).toBe(429);
    expect(await response.text()).toBe('rate limit reached');
  });
});
