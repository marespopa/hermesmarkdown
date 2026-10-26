// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileText, TextCache, type CachedFile } from "./text-cache";

const toEntry = (text: string, modified: number, size: number): CachedFile => ({ text, modified, size, checkedAt: Date.now() });

const fileFor = (state: { text: string; modified: number; size?: number }) => {
  const read = vi.fn(async () => state.text);
  const handle = {
    getFile: async () => ({ size: state.size ?? state.text.length, lastModified: state.modified, text: read }),
  } as unknown as FileSystemFileHandle;
  return { file: { path: "a.md", name: "a.md", handle }, read };
};

describe("readFileText", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("reuses the text within 2 s without checking the file", async () => {
    const cache = new TextCache<CachedFile>(1000);
    const state = { text: "hello", modified: 1 };
    const { file, read } = fileFor(state);
    expect((await readFileText(file, cache, toEntry))?.text).toBe("hello");
    state.text = "changed";
    state.modified = 2;
    vi.advanceTimersByTime(1000);
    expect((await readFileText(file, cache, toEntry))?.text).toBe("hello");
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("re-reads when the modified time or size changed, not when neither did", async () => {
    const cache = new TextCache<CachedFile>(1000);
    const state = { text: "hello", modified: 1 };
    const { file, read } = fileFor(state);
    await readFileText(file, cache, toEntry);
    vi.advanceTimersByTime(3000);
    await readFileText(file, cache, toEntry);
    expect(read).toHaveBeenCalledTimes(1);
    state.text = "hello!";
    state.modified = 2;
    vi.advanceTimersByTime(3000);
    expect((await readFileText(file, cache, toEntry))?.text).toBe("hello!");
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("skips files over 1M characters and files with a NUL in the first 8 KB", async () => {
    const cache = new TextCache<CachedFile>(1000);
    expect(await readFileText(fileFor({ text: "x", modified: 1, size: 1_000_001 }).file, cache, toEntry)).toBeNull();
    expect(await readFileText(fileFor({ text: "ab\u0000cd", modified: 1 }).file, cache, toEntry)).toBeNull();
  });

  it("uses given content without a handle, and returns null with neither", async () => {
    const cache = new TextCache<CachedFile>(1000);
    expect((await readFileText({ path: "a", name: "a", content: "text" }, cache, toEntry))?.text).toBe("text");
    expect(await readFileText({ path: "a", name: "a" }, cache, toEntry)).toBeNull();
  });
});

describe("TextCache", () => {
  it("evicts the oldest entries first at the character budget", () => {
    const cache = new TextCache<CachedFile>(10);
    cache.set("a", toEntry("aaaa", 1, 4));
    cache.set("b", toEntry("bbbb", 1, 4));
    cache.set("c", toEntry("cccc", 1, 4));
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeDefined();
    expect(cache.get("c")).toBeDefined();
  });

  it("doesn't keep one entry larger than the whole budget, and clears", () => {
    const cache = new TextCache<CachedFile>(3);
    cache.set("big", toEntry("abcdef", 1, 6));
    expect(cache.get("big")).toBeUndefined();
    cache.set("a", toEntry("ab", 1, 2));
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
  });

  it("replaces an entry for the same path without double counting", () => {
    const cache = new TextCache<CachedFile>(6);
    cache.set("a", toEntry("aaaa", 1, 4));
    cache.set("a", toEntry("bbbb", 2, 4));
    cache.set("b", toEntry("cc", 1, 2));
    expect(cache.get("a")?.text).toBe("bbbb");
    expect(cache.get("b")).toBeDefined();
  });
});
