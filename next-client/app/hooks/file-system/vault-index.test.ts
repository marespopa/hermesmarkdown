import { describe, expect, it, vi } from "vitest";
import type { CachedMetadata } from "@/app/services/metadata-cache";
import { indexVaultFiles, parseWithWorker, reusableEntry, statFiles, type VaultIndexDeps } from "./vault-index";

vi.mock("react-hot-toast", () => ({ default: { error: vi.fn(), success: vi.fn() } }));

function file(path: string, modifiedAt: number, content = `# ${path}`) {
  const handle = {
    kind: "file",
    name: path.split("/").pop()!,
    getFile: vi.fn(async () => ({ lastModified: modifiedAt, text: async () => content })),
  } as unknown as FileSystemFileHandle;
  return { handle, path };
}

function parsed(path: string, modifiedAt: number, extra: Partial<CachedMetadata> = {}): CachedMetadata {
  return {
    path,
    name: path.split("/").pop()!,
    tags: [],
    links: [],
    frontmatter: {},
    modifiedAt,
    wordCount: 1,
    tasks: [],
    preview: `preview of ${path}`,
    ...extra,
  };
}

function harness(overrides: Partial<VaultIndexDeps> = {}, initial: Record<string, any> = {}) {
  let metadata = initial;
  const deps: VaultIndexDeps = {
    loadCache: vi.fn(async () => null),
    saveCache: vi.fn(async () => {}),
    read: vi.fn(async (files) =>
      Promise.all(files.map(async (f) => {
        const blob = await f.handle.getFile();
        return { path: f.path, name: f.handle.name, content: await blob.text(), modifiedAt: blob.lastModified };
      })),
    ),
    parse: vi.fn(async (files) => files.map((f) => parsed(f.path, f.modifiedAt))),
    setMetadata: vi.fn((update) => { metadata = update(metadata); }),
    isCurrent: () => true,
    chunkSize: 2,
    ...overrides,
  };
  return { deps, get metadata() { return metadata; } };
}

describe("statFiles", () => {
  it("reads modified times without contents, and 0 for unreadable files", async () => {
    const good = file("a.md", 5);
    const bad = file("b.md", 0);
    (bad.handle.getFile as any).mockRejectedValue(new Error("locked"));
    const stats = await statFiles([good, bad]);
    expect(stats.map((s) => [s.path, s.modifiedAt])).toEqual([["a.md", 5], ["b.md", 0]]);
  });
});

describe("reusableEntry", () => {
  const stat = { ...file("a.md", 5), modifiedAt: 5 };

  it("reuses a cache entry parsed at the same modified time", () => {
    expect(reusableEntry(stat, { "a.md": parsed("a.md", 5) }, undefined)).toMatchObject({ preview: "preview of a.md" });
    expect(reusableEntry(stat, { "a.md": parsed("a.md", 4) }, undefined)).toBeNull();
  });

  it("reuses an earlier in-memory parse, but not an unparsed entry", () => {
    expect(reusableEntry(stat, null, { "a.md": { ...parsed("a.md", 5), handle: {} } })).not.toBeNull();
    expect(reusableEntry(stat, null, { "a.md": { path: "a.md", modifiedAt: 5 } })).toBeNull();
  });

  it("never reuses for a file that couldn't be stat'ed", () => {
    expect(reusableEntry({ ...stat, modifiedAt: 0 }, { "a.md": parsed("a.md", 0) }, undefined)).toBeNull();
  });
});

describe("indexVaultFiles", () => {
  it("dates every note before parsing, then parses newest first", async () => {
    const h = harness();
    const files = [file("old.md", 1), file("new.md", 3), file("mid.md", 2)];

    const { done } = await indexVaultFiles(files, true, h.deps);
    // Ordered by date immediately, not parsed yet.
    expect(h.metadata["new.md"]).toMatchObject({ modifiedAt: 3 });
    expect(h.metadata["new.md"].preview).toBeUndefined();

    await done;
    const readOrder = (h.deps.read as any).mock.calls.flatMap(([chunk]: any) => chunk.map((f: any) => f.path));
    expect(readOrder).toEqual(["new.md", "mid.md", "old.md"]);
    expect(h.metadata["old.md"].preview).toBe("preview of old.md");
    expect(h.metadata["old.md"].handle).toBe(files[0].handle);
  });

  it("takes unchanged notes from the cache without reading them, and saves the full index", async () => {
    const cached = { "same.md": parsed("same.md", 7, { tags: ["kept"] }), "gone.md": parsed("gone.md", 1) };
    const h = harness({ loadCache: vi.fn(async () => cached) });
    const files = [file("same.md", 7), file("changed.md", 9)];

    const { done } = await indexVaultFiles(files, true, h.deps);
    expect(h.metadata["same.md"]).toMatchObject({ tags: ["kept"], preview: "preview of same.md" });
    await done;

    const readPaths = (h.deps.read as any).mock.calls.flatMap(([chunk]: any) => chunk.map((f: any) => f.path));
    expect(readPaths).toEqual(["changed.md"]);
    const saved = (h.deps.saveCache as any).mock.calls[0][0];
    expect(Object.keys(saved).sort()).toEqual(["changed.md", "same.md"]);
    expect(saved["same.md"]).not.toHaveProperty("handle");
  });

  it("keeps earlier parses on re-index and drops files that are gone", async () => {
    const h = harness({}, {
      "note.md": { ...parsed("note.md", 2, { tags: ["kept"] }), handle: {} },
      "removed.md": { ...parsed("removed.md", 1), handle: {} },
    });
    const files = [file("note.md", 2)];

    const { done } = await indexVaultFiles(files, false, h.deps);
    await done;

    expect(h.metadata["note.md"]).toMatchObject({ tags: ["kept"], handle: files[0].handle });
    expect(h.metadata).not.toHaveProperty("removed.md");
    expect(h.deps.read).not.toHaveBeenCalled();
  });

  it("stops quietly once a newer run has started", async () => {
    let current = true;
    const h = harness({ isCurrent: () => current });
    const { done } = await indexVaultFiles([file("a.md", 1), file("b.md", 2), file("c.md", 3)], true, h.deps);
    current = false;
    await done;
    expect(h.deps.saveCache).not.toHaveBeenCalled();
  });
});

describe("parseWithWorker", () => {
  it("resolves with the results for its own request id", async () => {
    const listeners = new Set<(event: MessageEvent) => void>();
    const worker = {
      addEventListener: (_: string, listener: any) => listeners.add(listener),
      removeEventListener: (_: string, listener: any) => listeners.delete(listener),
      postMessage: ({ files, requestId }: any) => {
        queueMicrotask(() => {
          listeners.forEach((l) => l({ data: { results: [], requestId: requestId + 1000 } } as MessageEvent));
          listeners.forEach((l) => l({ data: { results: files.map((f: any) => parsed(f.path, 1)), requestId } } as MessageEvent));
        });
      },
    } as unknown as Worker;

    const results = await parseWithWorker(worker, [{ path: "a.md", name: "a.md", content: "", modifiedAt: 1 }]);
    expect(results.map((r) => r.path)).toEqual(["a.md"]);
    expect(listeners.size).toBe(0);
  });

  it("gives up with no results if the worker never answers", async () => {
    vi.useFakeTimers();
    try {
      const worker = { addEventListener: vi.fn(), removeEventListener: vi.fn(), postMessage: vi.fn() } as unknown as Worker;
      const pending = parseWithWorker(worker, [{ path: "a.md", name: "a.md", content: "", modifiedAt: 1 }], 100);
      await vi.advanceTimersByTimeAsync(100);
      await expect(pending).resolves.toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
});
