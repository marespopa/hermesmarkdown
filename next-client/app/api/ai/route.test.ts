// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateTextMock = vi.fn();
const generateObjectMock = vi.fn();
const fetchMock = vi.fn();

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => (modelId: string) => ({ modelId, provider: 'google' })),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => (modelId: string) => ({ modelId, provider: 'anthropic' })),
}));

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
  generateObject: (...args: unknown[]) => generateObjectMock(...args),
}));

describe('AI route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = fetchMock as typeof fetch;
    generateTextMock.mockResolvedValue({ text: 'AI response' });
    generateObjectMock.mockResolvedValue({
      object: {
        title: 'Example note',
        scope: 'One sentence summary',
        tags: ['example', 'note'],
        read_when: ['when you need to capture ideas'],
      },
    });
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

  it('serializes object metadata responses for structured prompts', async () => {
    const request = new Request('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        action: 'object',
        provider: 'claude',
        apiKey: 'anthropic-key',
        modelKey: 'haiku-4-5',
        noteBody: 'This is a note body',
      }),
    });

    const response = await (await import('./route')).POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      object: {
        title: 'Example note',
        scope: 'One sentence summary',
        tags: ['example', 'note'],
        read_when: ['when you need to capture ideas'],
      },
    });
    expect(generateObjectMock).toHaveBeenCalledTimes(1);
  });

  it('reports an empty chat reply as an error instead of returning no text', async () => {
    generateTextMock.mockResolvedValue({ text: '', finishReason: 'length' });
    const request = new Request('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        action: 'chat',
        provider: 'claude',
        apiKey: 'claude-key',
        modelKey: 'sonnet-5',
        system: 'Be brief',
        messages: [{ role: 'user', content: 'Summarize the release notes' }],
      }),
    });

    const response = await (await import('./route')).POST(request);
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toMatch(/ran out of output/);
  });

  it('passes the chat tools when asked and returns tool calls for the client to run', async () => {
    const responseMessages = [{ role: 'assistant', content: [{ type: 'tool-call', toolCallId: 'call-1', toolName: 'list_open_tasks', input: {} }] }];
    generateTextMock.mockResolvedValue({
      text: '',
      finishReason: 'tool-calls',
      toolCalls: [{ toolCallId: 'call-1', toolName: 'list_open_tasks', input: {} }],
      response: { messages: responseMessages },
    });
    const request = new Request('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        action: 'chat',
        provider: 'claude',
        apiKey: 'claude-key',
        modelKey: 'sonnet-5',
        system: 'Be brief',
        tools: true,
        messages: [{ role: 'user', content: 'What is due today?' }],
      }),
    });

    const response = await (await import('./route')).POST(request);
    const body = await response.json();

    expect(Object.keys(generateTextMock.mock.calls[0][0].tools)).toEqual(['search_notes', 'read_note', 'list_open_tasks']);
    expect(response.status).toBe(200);
    expect(body).toEqual({ text: '', toolCalls: [{ toolCallId: 'call-1', toolName: 'list_open_tasks', input: {} }], responseMessages });
  });
});
