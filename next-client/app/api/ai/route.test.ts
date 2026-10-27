// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateTextMock = vi.fn();
const fetchMock = vi.fn();

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => (modelId: string) => ({ modelId, provider: 'google' })),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => (modelId: string) => ({ modelId, provider: 'anthropic' })),
}));

vi.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: vi.fn((options: unknown) => (modelId: string) => ({ modelId, provider: 'ollama', options })),
}));

vi.mock('./base-url', async (importOriginal) => {
  const original = await importOriginal<typeof import('./base-url')>();
  return { ...original, validateBaseUrl: vi.fn(async (url: string) => {
    if (url.includes('localhost')) throw new original.BaseUrlError('it points at a local or internal host.');
    return url.replace(/\/+$/, '');
  }) };
});

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));

describe('AI route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = fetchMock as typeof fetch;
    generateTextMock.mockResolvedValue({ text: 'AI response' });
  });

  it('requires an API key before running a text request', async () => {
    const request = new Request('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({ action: 'text', provider: 'gemini', prompt: 'hello' }),
    });

    const response = await (await import('./route')).POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'API key is required' });
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it('sends Gemini text requests with system instructions folded into the prompt', async () => {
    const request = new Request('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        action: 'text',
        provider: 'gemini',
        apiKey: 'google-key',
        modelKey: 'gemini-flash',
        system: 'Be brief',
        prompt: 'Summarize this note',
      }),
    });

    const response = await (await import('./route')).POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ text: 'AI response' });
    expect(generateTextMock).toHaveBeenCalledWith({
      model: { modelId: 'gemini-3.5-flash', provider: 'google' },
      prompt: 'Be brief\n\n--- TASK ---\n\nSummarize this note',
    });
  });

  it('maps provider errors to sanitized HTTP responses', async () => {
    generateTextMock.mockRejectedValue(new Error('Invalid API key: sk-test-1234567890abcdef'));

    const request = new Request('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        action: 'text',
        provider: 'claude',
        apiKey: 'anthropic-key',
        modelKey: 'sonnet-5',
        system: 'Use plain language',
        prompt: 'Explain the issue',
      }),
    });

    const response = await (await import('./route')).POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Invalid API key: [REDACTED]' });
  });

  it('reports an empty reply as an error instead of returning no text', async () => {
    generateTextMock.mockResolvedValue({ text: '', finishReason: 'length' });
    const request = new Request('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        action: 'text',
        provider: 'claude',
        apiKey: 'claude-key',
        modelKey: 'sonnet-5',
        system: 'Be brief',
        prompt: 'Summarize the release notes',
      }),
    });

    const response = await (await import('./route')).POST(request);
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toMatch(/ran out of output/);
  });

  it('lists Ollama models without an API key', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ models: [{ name: 'llama3.2:latest' }, { name: 'qwen3:8b' }] })));
    const request = new Request('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({ action: 'models', provider: 'ollama', baseUrl: 'https://ollama.example.com/' }),
    });

    const response = await (await import('./route')).POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ models: [{ id: 'llama3.2:latest', name: 'llama3.2:latest' }, { id: 'qwen3:8b', name: 'qwen3:8b' }] });
    expect(fetchMock).toHaveBeenCalledWith('https://ollama.example.com/api/tags', expect.objectContaining({ headers: {} }));
  });

  it('sends the Ollama key as a Bearer token when there is one', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ models: [] })));
    const request = new Request('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({ action: 'models', provider: 'ollama', apiKey: 'ollama-key', baseUrl: 'https://ollama.com' }),
    });

    await (await import('./route')).POST(request);

    expect(fetchMock).toHaveBeenCalledWith('https://ollama.com/api/tags', expect.objectContaining({ headers: { Authorization: 'Bearer ollama-key' } }));
  });

  it('folds the system instructions into the prompt for Ollama text requests', async () => {
    const request = new Request('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({ action: 'text', provider: 'ollama', baseUrl: 'https://ollama.com', modelKey: 'qwen3:8b', system: 'Be brief', prompt: 'Summarize' }),
    });

    const response = await (await import('./route')).POST(request);

    expect(response.status).toBe(200);
    const call = generateTextMock.mock.calls[0][0];
    expect(call.model.modelId).toBe('qwen3:8b');
    expect(call.prompt).toBe('Be brief\n\n--- TASK ---\n\nSummarize');
  });

  it('rejects a restricted Ollama base URL before any request is made', async () => {
    const request = new Request('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({ action: 'models', provider: 'ollama', baseUrl: 'https://localhost:11434' }),
    });

    const response = await (await import('./route')).POST(request);

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/Base URL not allowed/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
