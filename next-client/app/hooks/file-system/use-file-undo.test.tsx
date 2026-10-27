import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { atom_fileUndoStack, atom_undoneFileGroups, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { textFingerprint } from "@/app/workers/replace-search";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import { relocateEntry } from "./directory-ops";
import { moveToTrash } from "./trash-ops";
import { useFileUndo } from "./use-file-undo";

vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/app/services/content-search-client", () => ({ remapNoteContent: vi.fn() }));
const rewriteLinks = vi.fn();
vi.mock("./use-rewrite-links", () => ({ useRewriteLinksAfterMove: () => rewriteLinks }));
// The note buffer writes straight to the memory vault: disk text in, the
// transform's text out.
vi.mock("./use-note-buffer", () => ({
  useNoteBuffer: () => ({
    readCurrentText: async (path: string) => memoryVault.fileAt(path)!.text(),
    writeThrough: async (path: string, _handle: unknown, transform: (text: string) => string | null) => {
      const next = transform(memoryVault.fileAt(path)!.text());
      if (next === null) return { result: "unchanged", inBuffer: false };
      await memoryVault.writeText(path, next);
      return { result: "written", inBuffer: false };
    },
  }),
}));
let memoryVault: MemoryDirectoryHandle;
beforeEach(() => {
  rewriteLinks.mockReset();
  rewriteLinks.mockResolvedValue({ updated: 0, failed: 0 });
});

async function setup() {
  const vault = new MemoryDirectoryHandle("vault");
  memoryVault = vault;
  await vault.writeText("notes/a.md", "x");
  const store = createStore();
  store.set(atom_vaultHandle, vault.asHandle());
  const scanVault = vi.fn().mockResolvedValue(undefined);
  const indexVaultTags = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() => useFileUndo({ scanVault, indexVaultTags }), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });
  return { vault, store, scanVault, result };
}

describe("useFileUndo", () => {
  it("puts a trashed note back and tidies its Trash slot", async () => {
    const { vault, store, scanVault, result } = await setup();
    const trashPath = await moveToTrash(vault.asHandle(), "notes/a.md", new Date("2026-10-06T09:00:00Z"));
    act(() => { result.current.recordUndo("Move to Trash", [{ from: "notes/a.md", to: trashPath }]); });

    let undone = false;
    await act(async () => { undone = await result.current.undoFileOperation(); });

    expect(undone).toBe(true);
    expect(vault.listPaths()).toEqual(["notes/a.md"]);
    expect(store.get(atom_fileUndoStack)).toEqual([]);
    expect(scanVault).toHaveBeenCalledWith(vault.asHandle());
  });

  it("takes back a rename, and a toast's Undo only while its action is the latest", async () => {
    const { vault, result } = await setup();
    await relocateEntry(vault.asHandle(), "notes/a.md", "notes/b.md");
    let first: any;
    act(() => { first = result.current.recordUndo("Rename", [{ from: "notes/a.md", to: "notes/b.md" }]); });
    await relocateEntry(vault.asHandle(), "notes/b.md", "notes/c.md");
    act(() => { result.current.recordUndo("Rename", [{ from: "notes/b.md", to: "notes/c.md" }]); });

    await act(async () => { expect(await result.current.undoFileOperation(first)).toBe(false); });
    expect(vault.listPaths()).toEqual(["notes/c.md"]);

    await act(async () => { await result.current.undoFileOperation(); });
    await act(async () => { await result.current.undoFileOperation(first); });
    expect(vault.listPaths()).toEqual(["notes/a.md"]);
  });

  it("rewrites links with the reverse mapping when a rename is undone, never for Trash", async () => {
    const { vault, result } = await setup();
    await relocateEntry(vault.asHandle(), "notes/a.md", "notes/b.md");
    act(() => { result.current.recordUndo("Rename", [{ from: "notes/a.md", to: "notes/b.md" }]); });
    await act(async () => { await result.current.undoFileOperation(); });
    expect(rewriteLinks).toHaveBeenCalledWith(expect.anything(), [{ from: "notes/b.md", to: "notes/a.md" }]);

    rewriteLinks.mockClear();
    const trashPath = await moveToTrash(vault.asHandle(), "notes/a.md", new Date("2026-10-06T09:00:00Z"));
    act(() => { result.current.recordUndo("Move to Trash", [{ from: "notes/a.md", to: trashPath }]); });
    await act(async () => { await result.current.undoFileOperation(); });
    expect(rewriteLinks).not.toHaveBeenCalled();
  });

  it("has nothing to undo in another vault", async () => {
    const { store, result } = await setup();
    act(() => { result.current.recordUndo("Rename", [{ from: "a.md", to: "b.md" }]); });
    store.set(atom_vaultHandle, new MemoryDirectoryHandle("other").asHandle());
    await act(async () => { expect(await result.current.undoFileOperation()).toBe(false); });
  });

  it("gathers a turn's changes in one group and undoes them newest first", async () => {
    const { vault, store, result } = await setup();
    const turn = { id: "turn-1", label: "AI changes" };
    // Edit a.md, make Archive/, move a.md there, edit it again, create b.md.
    await vault.writeText("notes/a.md", "edited");
    act(() => { result.current.recordSteps(turn, [{ kind: "content", path: "notes/a.md", before: "x", afterFingerprint: textFingerprint("edited") }]); });
    await vault.getDirectoryHandle("Archive", { create: true });
    act(() => { result.current.recordSteps(turn, [{ kind: "folder", path: "Archive" }]); });
    await relocateEntry(vault.asHandle(), "notes/a.md", "Archive/a.md");
    act(() => { result.current.recordUndo("Move", [{ from: "notes/a.md", to: "Archive/a.md" }], turn); });
    await vault.writeText("Archive/a.md", "edited twice");
    act(() => { result.current.recordSteps(turn, [{ kind: "content", path: "Archive/a.md", before: "edited", afterFingerprint: textFingerprint("edited twice") }]); });
    await vault.writeText("notes/b.md", "new");
    act(() => { result.current.recordSteps(turn, [{ kind: "create", path: "notes/b.md", afterFingerprint: textFingerprint("new") }]); });

    const stack = store.get(atom_fileUndoStack);
    expect(stack).toHaveLength(1);
    expect(stack[0].steps).toHaveLength(5);
    expect(stack[0].moves).toEqual([{ from: "notes/a.md", to: "Archive/a.md" }]);

    await act(async () => { expect(await result.current.undoFileOperation(stack[0])).toBe(true); });
    expect(vault.listPaths()).toEqual(["notes/a.md"]);
    expect(vault.fileAt("notes/a.md")!.text()).toBe("x");
    expect(store.get(atom_undoneFileGroups)["turn-1"]).toEqual({ restored: 5, skipped: [], failed: [] });
  });

  it("leaves a file the user changed since as it is, and says so", async () => {
    const { vault, store, result } = await setup();
    await vault.writeText("notes/a.md", "edited");
    act(() => { result.current.recordSteps({ id: "t", label: "AI changes" }, [{ kind: "content", path: "notes/a.md", before: "x", afterFingerprint: textFingerprint("edited") }]); });
    await vault.writeText("notes/a.md", "edited, then typed into");

    await act(async () => { await result.current.undoFileOperation(); });
    expect(vault.fileAt("notes/a.md")!.text()).toBe("edited, then typed into");
    expect(store.get(atom_undoneFileGroups).t).toEqual({ restored: 0, skipped: ["notes/a.md"], failed: [] });
  });
});
