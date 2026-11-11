import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TokenizerEncoding } from "@/app/atoms/tool-atoms";
import { useTokenizer } from "./use-tokenizer";

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  posted: { id: number; text: string; encoding: string }[] = [];
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage(message: { id: number; text: string; encoding: string }) {
    this.posted.push(message);
  }
  terminate() {}
}

const ok = (id: number, tokenCount: number) => ({ id, ok: true, tokenCount, segments: [], truncated: false });

function setup(initial: { text: string; encoding: TokenizerEncoding; enabled?: boolean }) {
  const hook = renderHook(
    (props: { text: string; encoding: TokenizerEncoding; enabled?: boolean }) =>
      useTokenizer(props.text, props.encoding, { enabled: props.enabled }),
    { initialProps: initial },
  );
  const worker = FakeWorker.instances[FakeWorker.instances.length - 1];
  const flush = () => act(() => void vi.advanceTimersByTime(120));
  const reply = (data: unknown) => act(() => worker.onmessage?.({ data }));
  const last = () => worker.posted[worker.posted.length - 1];
  return { hook, worker, flush, reply, last };
}

describe("useTokenizer", () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal("Worker", FakeWorker);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("is loading until the first result, then current", () => {
    const { hook, flush, reply, last } = setup({ text: "Hi", encoding: "o200k_base" });
    expect(hook.result.current.loading).toBe(true);
    flush();
    reply(ok(last().id, 1));
    expect(hook.result.current).toMatchObject({ loading: false, stale: false, resultEncoding: "o200k_base" });
    expect(hook.result.current.result?.tokenCount).toBe(1);
  });

  it("keeps the previous result, marked stale, while a change is counted", () => {
    const { hook, flush, reply, last } = setup({ text: "Hi", encoding: "o200k_base" });
    flush();
    reply(ok(last().id, 1));
    hook.rerender({ text: "Hi there", encoding: "o200k_base" });
    expect(hook.result.current.stale).toBe(true);
    expect(hook.result.current.result?.tokenCount).toBe(1);
    flush();
    reply(ok(last().id, 2));
    expect(hook.result.current.stale).toBe(false);
    expect(hook.result.current.result?.tokenCount).toBe(2);
  });

  it("drops a reply to an older request", () => {
    const { hook, flush, reply, last } = setup({ text: "Hi", encoding: "o200k_base" });
    flush();
    const first = last().id;
    hook.rerender({ text: "Hi there", encoding: "o200k_base" });
    flush();
    reply(ok(first, 99));
    expect(hook.result.current.result).toBeNull();
    reply(ok(last().id, 2));
    expect(hook.result.current.result?.tokenCount).toBe(2);
  });

  it("keeps the previous result when a new encoding fails, and says which encoding it is for", () => {
    const { hook, flush, reply, last } = setup({ text: "Hi", encoding: "o200k_base" });
    flush();
    reply(ok(last().id, 1));
    hook.rerender({ text: "Hi", encoding: "cl100k_base" });
    flush();
    reply({ id: last().id, ok: false, error: "network down" });
    expect(hook.result.current).toMatchObject({ error: "network down", resultEncoding: "o200k_base", stale: false });
    expect(hook.result.current.result?.tokenCount).toBe(1);
    // A later success clears the error.
    hook.rerender({ text: "Hi", encoding: "o200k_base" });
    flush();
    reply(ok(last().id, 1));
    expect(hook.result.current.error).toBeNull();
  });

  it("does not ask the worker while disabled", () => {
    const { worker, flush } = setup({ text: "Hi", encoding: "o200k_base", enabled: false });
    flush();
    expect(worker.posted).toHaveLength(0);
  });
});
