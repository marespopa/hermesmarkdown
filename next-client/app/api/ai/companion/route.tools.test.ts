// @vitest-environment node
// The route with the real AI SDK (streamText, the UI message stream) and a
// mock model: what the model is handed, and what streams back to the panel.
import { describe, expect, it, vi } from 'vitest';
import { MockLanguageModelV3 } from 'ai/test';

const seen: { tools?: { name: string; type: string }[]; prompt?: unknown } = {};
const model = new MockLanguageModelV3({
  doStream: async (options) => {
    seen.tools = options.tools as { name: string; type: string }[];
    seen.prompt = options.prompt;
    return {
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'stream-start', warnings: [] });
          controller.enqueue({ type: 'tool-call', toolCallId: 'call-1', toolName: 'read_file', input: '{"path":"Roadmap.md"}' });
          controller.enqueue({ type: 'finish', finishReason: 'tool-calls', usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } } as never);
          controller.close();
        },
      }),
    };
  },
});
vi.mock('../providers', () => ({ createAIModel: () => model }));

describe('AI companion route, end to end with a model', () => {
  it('hands the model every browser-run tool and streams its call back', async () => {
    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/ai/companion', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'claude', apiKey: 'k', modelKey: 'sonnet-5', system: 'Be brief',
        messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Edit the roadmap' }] }],
      }),
    }));
    const text = await response.text();
    expect(seen.tools?.map((t) => t.name)).toEqual(expect.arrayContaining(['edit_file', 'create_file', 'rename', 'move', 'trash', 'create_template']));
    expect(seen.tools?.every((t) => t.type === 'function')).toBe(true);
    expect(seen.prompt).toEqual([
      expect.objectContaining({ role: 'system', content: 'Be brief' }),
      expect.objectContaining({ role: 'user' }),
    ]);
    expect(text).toContain('"type":"tool-input-available"');
    expect(text).toContain('"toolName":"read_file"');
  });

  it('omits vault-mutating tools for a planning turn', async () => {
    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/ai/companion', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'claude', apiKey: 'k', modelKey: 'sonnet-5', system: 'Make a plan', planning: true,
        messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Plan the roadmap' }] }],
      }),
    }));
    await response.text();
    const tools = seen.tools?.map((tool) => tool.name) ?? [];
    expect(tools).toEqual(expect.arrayContaining(['read_file', 'search_files', 'update_plan']));
    expect(tools).not.toEqual(expect.arrayContaining(['edit_file', 'write_file', 'create_file', 'rename', 'move', 'trash', 'run_project_check']));
  });
});
