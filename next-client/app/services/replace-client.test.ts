import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReplaceQuery } from "@/app/workers/replace-search";
import type { GrepFile, ReplaceFileResult } from "@/app/workers/text-grep-protocol";

class FakeWorker {
  static instances: FakeWorker[] = [];
  listeners = new Set<(event: MessageEvent) => void>();
  sent: { type: string; scanId?: number; files?: GrepFile[] }[] = [];
  terminated = false;
  static throwOnHandles = false;
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage = vi.fn((message: { type: string; scanId?: number; files?: GrepFile[] }) => {
    if (FakeWorker.throwOnHandles && message.files?.some((file) => file.handle)) throw new Error("DataCloneError");
    this.sent.push(message);
  });
  addEventListener = vi.fn((_type: string, listener: (event: MessageEvent) => void) => this.listeners.add(listener));
  removeEventListener = vi.fn((_type: string, listener: (event: MessageEvent) => void) => this.listeners.delete(listener));
  terminate = vi.fn(() => {
    this.terminated = true;
  });
  reply(data: unknown) {
    for (const listener of [...this.listeners]) listener({ data } as MessageEvent);
  }
}

const query = (extra: Partial<ReplaceQuery> = {}): ReplaceQuery => ({ find: "x", matchCase: false, wholeWord: false, regex: false, ...extra });
const result = (path: string): ReplaceFileResult => ({ path, fingerprint: "1:a", matches: [] });
const report = (scanId: number, extra: Record<string, unknown> = {}) => ({
  type: "replace:results", scanId, files: [], scanned: 1, total: 2, matchCount: 0, done: false, ...extra,
});

async function load() {
  vi.resetModules();
  return import("./replace-client");
}

describe("replace-client", () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal("Worker", FakeWorker);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("posts replace:scan to its own worker", async () => {
    const { scanForReplace } = await load();
    scanForReplace(query(), [{ path: "a.md", name: "a.md", content: "x" }], vi.fn());
    const worker = FakeWorker.instances[0];
    expect(worker.sent.find((message) => message.type === "replace:scan")).toMatchObject({ scanId: 1, files: [{ path: "a.md" }] });
  });

  it("ignores results of an older scan and accumulates files", async () => {
    const { scanForReplace } = await load();
    const first = vi.fn();
    scanForReplace(query(), [], first);
    const worker = FakeWorker.instances[0];
    const second = vi.fn();
    scanForReplace(query({ find: "y" }), [], second);
    worker.reply(report(1, { files: [result("old.md")] }));
    expect(first).not.toHaveBeenCalled();
    worker.reply(report(2, { files: [result("a.md")] }));
    worker.reply(report(2, { files: [result("b.md")], done: true, scanned: 2 }));
    expect(second).toHaveBeenLastCalledWith(expect.objectContaining({ done: true, files: [result("a.md"), result("b.md")] }));
  });

  it("stops a regex scan that goes 2.5 s without a report and says stalled", async () => {
    const { scanForReplace } = await load();
    const onProgress = vi.fn();
    scanForReplace(query({ regex: true }), [], onProgress);
    const worker = FakeWorker.instances[0];
    worker.reply(report(1, { files: [result("a.md")] }));
    vi.advanceTimersByTime(2600);
    expect(worker.terminated).toBe(true);
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ done: true, stalled: true, files: [result("a.md")] }));
  });

  it("starts a fresh worker for the next scan after a stall", async () => {
    const { scanForReplace } = await load();
    scanForReplace(query({ regex: true }), [], vi.fn());
    vi.advanceTimersByTime(2600);
    scanForReplace(query(), [], vi.fn());
    expect(FakeWorker.instances).toHaveLength(2);
  });

  it("never terminates a text-mode scan", async () => {
    const { scanForReplace } = await load();
    scanForReplace(query(), [], vi.fn());
    vi.advanceTimersByTime(10_000);
    expect(FakeWorker.instances[0].terminated).toBe(false);
  });

  it("terminates the worker on dispose", async () => {
    const { scanForReplace, disposeReplaceWorker } = await load();
    scanForReplace(query(), [], vi.fn());
    disposeReplaceWorker();
    expect(FakeWorker.instances[0].terminated).toBe(true);
  });

  it("sends the files' text when the browser can't post handles", async () => {
    const { scanForReplace } = await load();
    const handle = { getFile: async () => ({ text: async () => "the text" }) } as unknown as FileSystemFileHandle;
    FakeWorker.throwOnHandles = true;
    scanForReplace(query(), [{ path: "a.md", name: "a.md", handle, isNote: true }], vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    const scan = FakeWorker.instances[0].sent.find((message) => message.type === "replace:scan");
    expect(scan?.files).toEqual([{ path: "a.md", name: "a.md", isNote: true, content: "the text" }]);
    FakeWorker.throwOnHandles = false;
  });

  it("reports availability from Worker support", async () => {
    const { isReplaceAvailable } = await load();
    expect(isReplaceAvailable()).toBe(true);
    vi.stubGlobal("Worker", undefined);
    expect(isReplaceAvailable()).toBe(false);
  });
});
