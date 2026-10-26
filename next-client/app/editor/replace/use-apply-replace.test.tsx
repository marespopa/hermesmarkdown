import React from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atom_lastReplace } from "@/app/atoms/replace-atoms";
import { textFingerprint } from "@/app/workers/replace-search";
import { useApplyReplace, type ApplyPlan, type ApplyProgress } from "./use-apply-replace";

const fs = vi.hoisted(() => ({
  vaultHandle: { name: "vault" } as unknown as FileSystemDirectoryHandle,
  indexVaultTags: vi.fn(async () => {}),
  disk: {} as Record<string, string>,
  failing: new Set<string>(),
  order: [] as string[],
}));
const indexNoteContent = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
const undoToast = vi.hoisted(() => vi.fn());

vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => ({ vaultHandle: fs.vaultHandle, indexVaultTags: fs.indexVaultTags }) }));
vi.mock("@/app/atoms/atoms", async (original) => ({
  ...(await original<object>()),
  resolveFileHandleAtPath: vi.fn(async (_vault: unknown, path: string) => ({
    name: path.split("/").pop(),
    path,
    getFile: async () => ({ lastModified: 42 }),
  })),
}));
vi.mock("@/app/hooks/file-system/use-note-buffer", () => ({
  useNoteBuffer: () => ({
    writeThrough: async (path: string, _handle: unknown, transform: (text: string) => string | null) => {
      fs.order.push(path);
      const next = transform(fs.disk[path]);
      if (next === null) return { result: "unchanged", inBuffer: false };
      if (fs.failing.has(path)) return { result: "failed", inBuffer: false };
      fs.disk[path] = next;
      return { result: "written", inBuffer: false };
    },
  }),
}));
vi.mock("@/app/services/content-search-client", () => ({ indexNoteContent }));
vi.mock("react-hot-toast", () => ({ default: toast }));
vi.mock("@/app/hooks/file-system/undo-toast", () => ({ showUndoToast: undoToast }));

const query = { find: "foo", matchCase: false, wholeWord: false, regex: false };
const entry = (path: string, skip: number[] = []) => ({ path, fingerprint: textFingerprint(fs.disk[path]), skip: new Set(skip) });
const plan = (...files: ApplyPlan["files"]): ApplyPlan => ({ query, template: "bar", files });

function setup() {
  const store = createStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  return { store, ...renderHook(() => useApplyReplace(), { wrapper }) };
}

describe("useApplyReplace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fs.disk = { "a.md": "foo one foo", "b.md": "foo two", "code.ts": "const foo = 1" };
    fs.failing.clear();
    fs.order = [];
    delete (fs.vaultHandle as unknown as Record<string, unknown>).queryPermission;
    delete (fs.vaultHandle as unknown as Record<string, unknown>).requestPermission;
  });
  afterEach(cleanup);

  it("writes included matches only and records the previous text for Undo", async () => {
    const { result, store } = setup();
    const events: ApplyProgress[] = [];
    let outcome!: Awaited<ReturnType<typeof result.current.apply>>;
    await act(async () => {
      outcome = await result.current.apply(plan(entry("a.md", [1]), entry("b.md")), (event) => events.push(event));
    });
    expect(fs.disk).toMatchObject({ "a.md": "bar one foo", "b.md": "bar two" });
    expect(outcome).toMatchObject({ matches: 2, files: 2, skipped: 0, failed: 0 });
    expect(events.map((event) => `${event.path}:${event.state}:${event.done}`)).toEqual([
      "a.md:replacing:0", "a.md:replaced:1", "b.md:replacing:1", "b.md:replaced:2",
    ]);
    const last = store.get(atom_lastReplace);
    expect(last?.matches).toBe(2);
    expect(last?.files[0]).toEqual({ path: "a.md", before: "foo one foo", afterFingerprint: textFingerprint("bar one foo") });
    expect(undoToast).toHaveBeenCalledWith(expect.stringContaining("Replaced 2 matches in 2 files"), expect.any(Function), expect.anything());
  });

  it("skips a file whose text changed since the preview, without writing it", async () => {
    const { result } = setup();
    const stale = entry("a.md");
    fs.disk["a.md"] = "foo edited since";
    let outcome!: Awaited<ReturnType<typeof result.current.apply>>;
    await act(async () => {
      outcome = await result.current.apply(plan(stale, entry("b.md")), () => {});
    });
    expect(fs.disk["a.md"]).toBe("foo edited since");
    expect(outcome.results).toEqual({ "a.md": "skipped", "b.md": "replaced" });
    expect(outcome.skipped).toBe(1);
    expect(undoToast).toHaveBeenCalledWith(expect.stringContaining("1 file skipped"), expect.any(Function), expect.anything());
  });

  it("counts a failed write and goes on with the rest", async () => {
    fs.failing.add("a.md");
    const { result } = setup();
    let outcome!: Awaited<ReturnType<typeof result.current.apply>>;
    await act(async () => {
      outcome = await result.current.apply(plan(entry("a.md"), entry("b.md")), () => {});
    });
    expect(outcome.results).toEqual({ "a.md": "failed", "b.md": "replaced" });
    expect(fs.order).toEqual(["a.md", "b.md"]);
    expect(undoToast).toHaveBeenCalledWith(expect.stringContaining("1 file failed"), expect.any(Function), expect.anything());
  });

  it("shows an error toast when nothing was written", async () => {
    fs.failing.add("a.md");
    const { result, store } = setup();
    await act(async () => {
      await result.current.apply(plan(entry("a.md")), () => {});
    });
    expect(toast.error).toHaveBeenCalled();
    expect(undoToast).not.toHaveBeenCalled();
    expect(store.get(atom_lastReplace)).toBeNull();
  });

  it("indexes written notes only, and refreshes tags", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.apply(plan(entry("a.md"), entry("code.ts")), () => {});
    });
    await vi.waitFor(() => expect(indexNoteContent).toHaveBeenCalledWith([{ path: "a.md", name: "a.md", content: "bar one bar", modifiedAt: 42 }]));
    expect(fs.indexVaultTags).toHaveBeenCalled();
  });

  it("writes nothing and says so when write permission is refused", async () => {
    const handle = fs.vaultHandle as unknown as Record<string, unknown>;
    handle.queryPermission = vi.fn(async () => "prompt");
    handle.requestPermission = vi.fn(async () => "denied");
    const { result } = setup();
    let outcome!: Awaited<ReturnType<typeof result.current.apply>>;
    await act(async () => {
      outcome = await result.current.apply(plan(entry("a.md")), () => {});
    });
    expect(handle.requestPermission).toHaveBeenCalledWith({ mode: "readwrite" });
    expect(outcome.denied).toBe(true);
    expect(fs.disk["a.md"]).toBe("foo one foo");
    expect(toast.error).toHaveBeenCalledWith("Write permission denied. Re-open the vault to restore access.");
  });

  it("asks for permission only when it isn't granted", async () => {
    const handle = fs.vaultHandle as unknown as Record<string, unknown>;
    handle.queryPermission = vi.fn(async () => "granted");
    handle.requestPermission = vi.fn();
    const { result } = setup();
    await act(async () => {
      await result.current.apply(plan(entry("a.md")), () => {});
    });
    expect(handle.requestPermission).not.toHaveBeenCalled();
    expect(fs.disk["a.md"]).toBe("bar one bar");
  });

  it("undoes only files that still hold what the replace wrote", async () => {
    const { result, store } = setup();
    await act(async () => {
      await result.current.apply(plan(entry("a.md"), entry("b.md")), () => {});
    });
    fs.disk["b.md"] = "bar two, edited later";
    const last = store.get(atom_lastReplace)!;
    await act(async () => {
      await result.current.undo(last);
    });
    expect(fs.disk["a.md"]).toBe("foo one foo");
    expect(fs.disk["b.md"]).toBe("bar two, edited later");
    expect(store.get(atom_lastReplace)).toBeNull();
    expect(toast.success).toHaveBeenCalledWith("Restored 1 file · 1 file changed since and was left as is");
  });

  it("ignores an Undo from another vault", async () => {
    const { result, store } = setup();
    await act(async () => {
      await result.current.apply(plan(entry("a.md")), () => {});
    });
    const last = { ...store.get(atom_lastReplace)!, vault: { name: "other" } as unknown as FileSystemDirectoryHandle };
    await act(async () => {
      await result.current.undo(last);
    });
    expect(fs.disk["a.md"]).toBe("bar one bar");
  });
});
