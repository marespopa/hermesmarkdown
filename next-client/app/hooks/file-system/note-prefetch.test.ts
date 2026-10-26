import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  noteTyped,
  prefetchNote,
  PREFETCH_MAX_ENTRIES,
  PREFETCH_MAX_FILE_BYTES,
  PREFETCH_TYPING_QUIET_MS,
  resetPrefetch,
  takePrefetched,
} from "./note-prefetch";

function handle(text: string, lastModified = 1, size = text.length) {
  const file = { lastModified, size, text: vi.fn(async () => text) };
  return { file, handle: { getFile: vi.fn(async () => file) } as unknown as FileSystemFileHandle };
}

// Lets the getFile / text promises settle.
const flush = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};

beforeEach(() => resetPrefetch());
afterEach(() => vi.useRealTimers());

describe("note prefetch", () => {
  it("serves the read-ahead text while the file is unchanged, once", async () => {
    const { handle: h } = handle("Hello", 5);
    prefetchNote("a.md", h);
    await flush();
    expect(takePrefetched("a.md", { lastModified: 5, size: 5 })).toBe("Hello");
    expect(takePrefetched("a.md", { lastModified: 5, size: 5 })).toBeNull();
  });

  it("drops it when the file changed on disk since (disk wins)", async () => {
    const { handle: h } = handle("Hello", 5);
    prefetchNote("a.md", h);
    await flush();
    expect(takePrefetched("a.md", { lastModified: 6, size: 5 })).toBeNull();
  });

  it("runs one read at a time and keeps only the newest target", async () => {
    let release!: () => void;
    const slow = { lastModified: 1, size: 1, text: vi.fn(() => new Promise<string>((resolve) => { release = () => resolve("A"); })) };
    const a = { getFile: vi.fn(async () => slow) } as unknown as FileSystemFileHandle;
    const b = handle("B");
    const c = handle("C");
    prefetchNote("a.md", a);
    await flush();
    prefetchNote("b.md", b.handle);
    prefetchNote("c.md", c.handle);
    expect(b.handle.getFile).not.toHaveBeenCalled();
    release();
    await flush();
    await flush();
    expect(takePrefetched("a.md", { lastModified: 1, size: 1 })).toBeNull();
    expect(b.handle.getFile).not.toHaveBeenCalled();
    expect(takePrefetched("c.md", { lastModified: 1, size: 1 })).toBe("C");
  });

  it("skips files over the size limit", async () => {
    const big = handle("x", 1, PREFETCH_MAX_FILE_BYTES + 1);
    prefetchNote("big.md", big.handle);
    await flush();
    expect(big.file.text).not.toHaveBeenCalled();
  });

  it("keeps only the most recent entries", async () => {
    for (let i = 0; i <= PREFETCH_MAX_ENTRIES; i++) {
      prefetchNote(`${i}.md`, handle(`${i}`).handle);
      await flush();
    }
    expect(takePrefetched("0.md", { lastModified: 1, size: 1 })).toBeNull();
    expect(takePrefetched(`${PREFETCH_MAX_ENTRIES}.md`, { lastModified: 1, size: 1 })).toBe(`${PREFETCH_MAX_ENTRIES}`);
  });

  it("does nothing while the user is typing", async () => {
    vi.useFakeTimers();
    noteTyped();
    const { handle: h } = handle("A");
    prefetchNote("a.md", h);
    expect(h.getFile).not.toHaveBeenCalled();
    vi.advanceTimersByTime(PREFETCH_TYPING_QUIET_MS + 1);
    prefetchNote("a.md", h);
    expect(h.getFile).toHaveBeenCalled();
  });
});
