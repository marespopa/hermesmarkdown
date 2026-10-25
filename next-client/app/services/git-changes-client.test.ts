import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const scanChanges = vi.fn();
vi.mock("@/app/services/git/git-changes-scan", () => ({ scanChanges: (...args: unknown[]) => scanChanges(...args) }));

const vault = {} as FileSystemDirectoryHandle;

beforeEach(() => {
  vi.resetModules();
  scanChanges.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("startChangesScan without Worker", () => {
  it("runs inline and forwards progress", async () => {
    vi.stubGlobal("Worker", undefined);
    scanChanges.mockImplementation(async (_vault, options) => {
      options.onProgress({ phase: "listing", done: 3, total: 0 });
      return { status: "no-repo" };
    });
    const { startChangesScan } = await import("./git-changes-client");
    const onProgress = vi.fn();
    expect(await startChangesScan(vault, onProgress).result).toEqual({ status: "no-repo" });
    expect(onProgress).toHaveBeenCalledWith({ phase: "listing", done: 3, total: 0 });
  });

  it("cancel makes the inline scan see isCancelled", async () => {
    vi.stubGlobal("Worker", undefined);
    scanChanges.mockImplementation(async (_vault, options) => (options.isCancelled() ? "cancelled" : { status: "error" }));
    const { startChangesScan } = await import("./git-changes-client");
    const scan = startChangesScan(vault, () => {});
    scan.cancel();
    expect(await scan.result).toBe("cancelled");
  });
});

describe("startChangesScan with a Worker", () => {
  it("passes progress and the result through and posts cancel", async () => {
    const posted: unknown[] = [];
    const listeners: ((event: MessageEvent) => void)[] = [];
    class StubWorker {
      postMessage(message: unknown) {
        posted.push(message);
      }
      addEventListener(_type: string, listener: (event: MessageEvent) => void) {
        listeners.push(listener);
      }
    }
    vi.stubGlobal("Worker", StubWorker);
    const { startChangesScan } = await import("./git-changes-client");
    const onProgress = vi.fn();
    const scan = startChangesScan(vault, onProgress);
    const requestId = (posted[0] as { requestId: number }).requestId;
    expect(posted[0]).toMatchObject({ type: "changes:scan" });
    listeners[0]({ data: { type: "changes:started", requestId } } as MessageEvent);
    const progress = { phase: "comparing", done: 1, total: 4 };
    listeners[0]({ data: { type: "changes:progress", requestId, progress } } as MessageEvent);
    expect(onProgress).toHaveBeenCalledWith(progress);
    scan.cancel();
    expect(posted[1]).toEqual({ type: "changes:cancel", requestId });
    listeners[0]({ data: { type: "changes:result", requestId, result: "cancelled" } } as MessageEvent);
    expect(await scan.result).toBe("cancelled");
    expect(scanChanges).not.toHaveBeenCalled();
  });

  it("scans on the page when the worker never starts", async () => {
    vi.useFakeTimers();
    class SilentWorker {
      postMessage() {}
      addEventListener() {}
      terminate() {}
    }
    vi.stubGlobal("Worker", SilentWorker);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    scanChanges.mockResolvedValue({ status: "ok", commit: null, files: [] });
    const { startChangesScan, START_TIMEOUT_MS } = await import("./git-changes-client");
    const scan = startChangesScan(vault, () => {});
    await vi.advanceTimersByTimeAsync(START_TIMEOUT_MS);
    vi.useRealTimers();
    expect(await scan.result).toEqual({ status: "ok", commit: null, files: [] });
    expect(scanChanges).toHaveBeenCalledTimes(1);
  });

  it("scans on the page when the browser refuses the worker access", async () => {
    const posted: { requestId: number }[] = [];
    const listeners: ((event: MessageEvent) => void)[] = [];
    class RefusedWorker {
      postMessage(message: { requestId: number }) {
        posted.push(message);
      }
      addEventListener(type: string, listener: (event: MessageEvent) => void) {
        if (type === "message") listeners.push(listener);
      }
      terminate() {}
    }
    vi.stubGlobal("Worker", RefusedWorker);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    scanChanges.mockResolvedValue({ status: "ok", commit: null, files: [] });
    const { startChangesScan } = await import("./git-changes-client");
    const scan = startChangesScan(vault, () => {});
    const { requestId } = posted[0];
    listeners[0]({ data: { type: "changes:started", requestId } } as MessageEvent);
    listeners[0]({ data: { type: "changes:result", requestId, result: { status: "error", detail: "NotAllowedError: refused" } } } as MessageEvent);
    expect(await scan.result).toEqual({ status: "ok", commit: null, files: [] });
    // Later scans skip the worker.
    expect(await startChangesScan(vault, () => {}).result).toEqual({ status: "ok", commit: null, files: [] });
    expect(posted).toHaveLength(1);
  });

  it("scans on the page when the worker errors", async () => {
    const listeners = new Map<string, (event: unknown) => void>();
    class FailingWorker {
      postMessage() {}
      addEventListener(type: string, listener: (event: unknown) => void) {
        listeners.set(type, listener);
      }
      terminate() {}
    }
    vi.stubGlobal("Worker", FailingWorker);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    scanChanges.mockResolvedValue({ status: "no-repo" });
    const { startChangesScan } = await import("./git-changes-client");
    const scan = startChangesScan(vault, () => {});
    listeners.get("error")!(new Event("error"));
    expect(await scan.result).toEqual({ status: "no-repo" });
  });
});
