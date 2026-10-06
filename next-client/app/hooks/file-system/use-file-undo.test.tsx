import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { describe, expect, it, vi } from "vitest";
import { atom_fileUndoStack, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { MemoryDirectoryHandle } from "@/app/services/memory-file-system.test-utils";
import { relocateEntry } from "./directory-ops";
import { moveToTrash } from "./trash-ops";
import { useFileUndo } from "./use-file-undo";

vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/app/services/content-search-client", () => ({ remapNoteContent: vi.fn() }));

async function setup() {
  const vault = new MemoryDirectoryHandle("vault");
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

  it("has nothing to undo in another vault", async () => {
    const { store, result } = await setup();
    act(() => { result.current.recordUndo("Rename", [{ from: "a.md", to: "b.md" }]); });
    store.set(atom_vaultHandle, new MemoryDirectoryHandle("other").asHandle());
    await act(async () => { expect(await result.current.undoFileOperation()).toBe(false); });
  });
});
