// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { withKeepAlive } from './keep-alive';

const PING = ': keep-alive\n\n';
const EVENT = 'data: {"type":"start"}\n\n';

describe('withKeepAlive', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('pings at once and while the model is silent, then passes the reply through', async () => {
    vi.useFakeTimers();
    // The model's reply: nothing until `answer` is called.
    let answer!: () => void;
    const silent = new ReadableStream<Uint8Array>({
      start(controller) {
        answer = () => {
          controller.enqueue(new TextEncoder().encode(EVENT));
          controller.close();
        };
      },
    });

    const response = withKeepAlive(new Response(silent, { headers: { 'content-type': 'text/event-stream' } }), 1000);
    expect(response.headers.get('content-type')).toBe('text/event-stream');

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    expect(decoder.decode((await reader.read()).value)).toBe(PING);

    vi.advanceTimersByTime(2000);
    expect(decoder.decode((await reader.read()).value)).toBe(PING);
    expect(decoder.decode((await reader.read()).value)).toBe(PING);

    answer();
    let rest = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      rest += decoder.decode(value);
    }
    expect(rest).toBe(EVENT);

    // The stream ended, so no more pings are scheduled.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops pinging when the browser goes away', async () => {
    vi.useFakeTimers();
    const response = withKeepAlive(new Response(new ReadableStream<Uint8Array>({ pull: () => new Promise(() => {}) })), 1000);
    await response.body!.cancel();
    expect(vi.getTimerCount()).toBe(0);
  });
});
