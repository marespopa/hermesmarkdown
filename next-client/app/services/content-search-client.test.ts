import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ worker: null as any }));

vi.mock("@/app/hooks/file-system/shared", () => ({
  get metadataWorker() {
    return state.worker;
  },
}));

import {
  indexNoteContent,
  isContentSearchAvailable,
  markContentIndexed,
  needsContentIndex,
  remapNoteContent,
  removeNoteContent,
  searchNoteContent,
} from "./content-search-client";

function fakeWorker() {
  const listeners = new Set<(event: MessageEvent) => void>();
  return {
    listeners,
    postMessage: vi.fn(),
    addEventListener: vi.fn((_: string, listener: any) => listeners.add(listener)),
    removeEventListener: vi.fn((_: string, listener: any) => listeners.delete(listener)),
    reply(data: unknown) {
      listeners.forEach((listener) => listener({ data } as MessageEvent));
    },
  };
}

describe("content-search-client", () => {
  let worker: ReturnType<typeof fakeWorker>;

  beforeEach(() => {
    worker = fakeWorker();
    state.worker = worker;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tracks which notes the worker has, through mark, index, remove and remap", () => {
    markContentIndexed([{ path: "track/a.md", modifiedAt: 5 }]);
    expect(needsContentIndex("track/a.md", 5)).toBe(false);
    expect(needsContentIndex("track/a.md", 6)).toBe(true);

    indexNoteContent([{ path: "track/b.md", name: "b.md", content: "text", modifiedAt: 7 }]);
    expect(needsContentIndex("track/b.md", 7)).toBe(false);
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "content:index", files: [{ path: "track/b.md", name: "b.md", content: "text", modifiedAt: 7 }] });

    remapNoteContent("track", "moved");
    expect(needsContentIndex("moved/a.md", 5)).toBe(false);
    expect(needsContentIndex("track/a.md", 5)).toBe(true);
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "content:remap", oldPath: "track", newPath: "moved" });

    removeNoteContent(["moved/a.md"]);
    expect(needsContentIndex("moved/a.md", 5)).toBe(true);
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "content:remove", paths: ["moved/a.md"] });
  });

  it("resolves a search only with the reply for its own id", async () => {
    const pending = searchNoteContent("needle", ["a.md"]);
    const { searchId } = worker.postMessage.mock.calls[0][0];
    expect(worker.postMessage.mock.calls[0][0]).toMatchObject({ type: "content:search", query: "needle", paths: ["a.md"], limit: 50 });

    worker.reply({ results: [], requestId: 1 });
    worker.reply({ type: "content:results", searchId: searchId + 100, hits: [], pending: 0, capped: false });
    worker.reply({ type: "content:results", searchId, hits: [{ path: "a.md" }], pending: 2, capped: false });

    await expect(pending).resolves.toEqual({ hits: [{ path: "a.md" }], pending: 2, capped: false });
    expect(worker.listeners.size).toBe(0);
  });

  it("resolves an older search with null once a newer one starts", async () => {
    const older = searchNoteContent("first", []);
    const newer = searchNoteContent("second", []);
    await expect(older).resolves.toBeNull();

    const { searchId } = worker.postMessage.mock.calls[1][0];
    worker.reply({ type: "content:results", searchId, hits: [], pending: 0, capped: false });
    await expect(newer).resolves.toEqual({ hits: [], pending: 0, capped: false });
    expect(worker.listeners.size).toBe(0);
  });

  it("resolves null when the worker never answers", async () => {
    vi.useFakeTimers();
    const pending = searchNoteContent("needle", []);
    await vi.advanceTimersByTimeAsync(5000);
    await expect(pending).resolves.toBeNull();
    expect(worker.listeners.size).toBe(0);
  });

  it("is unavailable and does nothing without a worker", async () => {
    state.worker = null;
    expect(isContentSearchAvailable()).toBe(false);
    expect(() => {
      markContentIndexed([{ path: "x.md", modifiedAt: 1 }]);
      indexNoteContent([{ path: "x.md", name: "x.md", content: "", modifiedAt: 1 }]);
      removeNoteContent(["x.md"]);
      remapNoteContent("x.md", "y.md");
    }).not.toThrow();
    await expect(searchNoteContent("needle", [])).resolves.toBeNull();
  });
});
